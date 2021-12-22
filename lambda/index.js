'use strict';

const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');

const GoogleAssistant = require('./assistant');
const { getDeviceLocation } = require('./device');
const { register } = require('./project');
const { uploadStreamFile } = require('./storage');
const { encode } = require('./transcoder');
const { formatUtterance } = require('./utils');

const i18n = require('./i18n');

/**
 * Defines launch request handler
 * @type {Object}
 */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechOutput = handlerInput.t('message.welcome');
    return handlerInput.responseBuilder.speak(speechOutput).reprompt().getResponse();
  }
};

/**
 * Defines search intent handler
 * @type {Object}
 */
const SearchIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'SearchIntent'
    );
  },
  async handle(handlerInput, utteranceText) {
    console.log('Search Intent');

    // Set input text using direct utterance from another intent if available, otherwise alexa search slot value
    const inputText = utteranceText ? utteranceText : Alexa.getSlotValue(handlerInput.requestEnvelope, 'search');
    console.log(`Input text to process is "${inputText}"`);

    // Get access token, locale and user id properties from request object
    const accessToken = Alexa.getAccountLinkingAccessToken(handlerInput.requestEnvelope);
    const locale = Alexa.getLocale(handlerInput.requestEnvelope);
    const userId = Alexa.getUserId(handlerInput.requestEnvelope);
    console.log('Access Token:', accessToken);
    console.log('Locale:', locale);
    console.log('User ID:', userId);

    // Check if access token was provided
    if (!accessToken) {
      const speechOutput = handlerInput.t('error.access_token');
      return handlerInput.responseBuilder.speak(speechOutput).getResponse();
    }

    // Load persistence attributes
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();
    console.log('Attributes:', attributes);

    try {
      // Register project if not done already
      if (!attributes.registered) {
        await register(accessToken);
        attributes.registered = true;
      }

      // Get device location coordinates
      const location = await getDeviceLocation(handlerInput);
      // Create new google assistant object
      const assistant = new GoogleAssistant(accessToken, locale, location);
      // Get google assistant response
      const [responseFile, responseText] = await assistant.query(inputText, attributes);
      // Encode response pcm to mp3
      const mp3File = await encode(responseFile);
      // Upload mp3 file to s3 and get signed url
      const signedURL = await uploadStreamFile(mp3File, userId);

      // Build response using mp3 file signed URL
      const speechOutput = '<audio src="' + Alexa.escapeXmlCharacters(signedURL) + '"/>';
      handlerInput.responseBuilder.speak(speechOutput);

      // Add standard card if response text available
      if (responseText) {
        const cardTitle = formatUtterance(inputText, locale, handlerInput.t);
        const cardContent = responseText;
        console.log('Card title:', cardTitle);
        console.log('Card content:', cardContent);
        handlerInput.responseBuilder.withSimpleCard(cardTitle, cardContent);
      }

      // If API has requested Microphone to stay open then will create an Alexa 'Ask' response
      // We also keep the microphone on the launch intent 'Hello' request as for some reason the API closes the microphone
      if (attributes.microphoneOpen || inputText === 'hello') {
        console.log('Microphone is open so keeping session open');
        handlerInput.responseBuilder.reprompt();
      } else {
        // Otherwise we create an Alexa 'Tell' command which will close the session
        console.log('Microphone is closed so closing session');
        handlerInput.responseBuilder.withShouldEndSession(true);
      }
    } catch (error) {
      const key = error instanceof Error ? 'error.default' : error;
      const speechOutput = handlerInput.t(key);
      handlerInput.responseBuilder.speak(speechOutput);
    }

    // Save persistent attributes
    handlerInput.attributesManager.setPersistentAttributes(attributes);
    await handlerInput.attributesManager.savePersistentAttributes();

    return handlerInput.responseBuilder.getResponse();
  }
};

/**
 * Defines yes intent handler
 * @type {Object}
 */
const YesIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
    );
  },
  async handle(handlerInput) {
    console.log('Yes Intent');
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();

    if (attributes.microphoneOpen) {
      const utteranceText = handlerInput.t('utterance.yes');
      return SearchIntentHandler.handle(handlerInput, utteranceText);
    }
  }
};

/**
 * Defines no intent handler
 * @type {Object}
 */
const NoIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
    );
  },
  async handle(handlerInput) {
    console.log('No Intent');
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();

    if (attributes.microphoneOpen) {
      const utteranceText = handlerInput.t('utterance.no');
      return SearchIntentHandler.handle(handlerInput, utteranceText);
    }
  }
};

/**
 * Defines help intent handler
 * @type {Object}
 */
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    console.log('Help Intent');
    const utteranceText = handlerInput.t('utterance.help');
    return SearchIntentHandler.handle(handlerInput, utteranceText);
  }
};

/**
 * Defines stop intent handler
 * @type {Object}
 */
const StopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
    );
  },
  async handle(handlerInput) {
    console.log('Stop Intent');
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();

    if (attributes.microphoneOpen) {
      const utteranceText = handlerInput.t('utterance.stop');
      return SearchIntentHandler.handle(handlerInput, utteranceText);
    }

    const speechOutput = handlerInput.t('message.goodbye');
    return handlerInput.responseBuilder.speak(speechOutput).getResponse();
  }
};

/**
 * Defines cancel intent handler
 * @type {Object}
 */
const CancelIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
    );
  },
  async handle(handlerInput) {
    console.log('Cancel Intent');
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();

    if (attributes.microphoneOpen) {
      const utteranceText = handlerInput.t('utterance.cancel');
      return SearchIntentHandler.handle(handlerInput, utteranceText);
    }

    const speechOutput = handlerInput.t('message.goodbye');
    return handlerInput.responseBuilder.speak(speechOutput).getResponse();
  }
};

/**
 * Defines unhandled intent handler
 * @type {Object}
 */
const UnhandledIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    console.log('Unhandled event');
    const speechOutput = handlerInput.t('message.unhandled');
    return handlerInput.responseBuilder.speak(speechOutput).getResponse();
  }
};

/**
 * Defines session ended request handler
 * @type {Object}
 */
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  async handle(handlerInput) {
    console.log('Session ended request');
    console.log(`Session has ended with reason ${handlerInput.requestEnvelope.request.reason}`);
    // Google Assistant will keep the conversation thread open even if we don't give a response to an ask.
    // We need to close the conversation if an ask response is not given (which will end up here)
    // The easiest way to do this is to just send a goodbye command and this will close the conversation for us
    // (this is against Amazons guides but we're not submitting this!)
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();

    if (attributes.microphoneOpen) {
      const utteranceText = handlerInput.t('utterance.goodbye');
      return SearchIntentHandler.handle(handlerInput, utteranceText);
    }
  }
};

/**
 * Defines error handler
 * @type {Object}
 */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Request error:', error);
    const speechOutput = handlerInput.t('error.default');
    return handlerInput.responseBuilder.speak(speechOutput).getResponse();
  }
};

/**
 * Defines localize request interceptor
 * @type {Object}
 */
const LocalizeRequestInterceptor = {
  async process(handlerInput) {
    const locale = Alexa.getLocale(handlerInput.requestEnvelope);
    handlerInput.t = await i18n.init(locale);
  }
};

/**
 * Defines log request interceptor
 * @type {Object}
 */
const LogRequestInterceptor = {
  process(handlerInput) {
    console.log('Request received:', JSON.stringify(handlerInput.requestEnvelope));
  }
};

/**
 * Defines log response interceptor
 * @type {Object}
 */
const LogResponseInterceptor = {
  process(handlerInput, response) {
    console.log('Response sent:', JSON.stringify(response));
  }
};

/**
 * Defines persistent adapter
 * @type {DynamoDbPersistenceAdapter}
 */
const persistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: process.env.TABLE_NAME,
  partitionKeyName: 'userId'
});

/**
 * Defines skill lambda handler
 * @type {Function}
 */
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    SearchIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    HelpIntentHandler,
    StopIntentHandler,
    CancelIntentHandler,
    UnhandledIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LocalizeRequestInterceptor, LogRequestInterceptor)
  .addResponseInterceptors(LogResponseInterceptor)
  .withApiClient(new Alexa.DefaultApiClient())
  .withPersistenceAdapter(persistenceAdapter)
  .withSkillId(process.env.SKILL_ID)
  .lambda();

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const protoFiles = require('google-proto-files');
const { OAuth2Client } = require('google-auth-library');

const packageDefinition = protoLoader.loadSync(protoFiles.embeddedAssistant.v1alpha2, {
  includeDirs: [protoFiles.getProtoPath('..')],
  enums: String,
  longs: String,
  defaults: true,
  keepCase: true,
  oneofs: true
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const { EmbeddedAssistant } = protoDescriptor.google.assistant.embedded.v1alpha2;

// Get environment settings
const GOOGLE_ASSISTANT_API_ENDPOINT = process.env.GOOGLE_ASSISTANT_API_ENDPOINT;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

// New conversation time lapse in seconds
const NEW_CONVERSATION_TIME_LAPSE = 900; // 15 minutes

// Supported locales
//  https://developers.google.com/assistant/sdk/reference/rpc/languages
const SUPPORTED_LOCALES = [
  'de-DE',
  'en-AU',
  'en-CA',
  'en-GB',
  'en-IN',
  'en-US',
  'es-ES',
  'es-MX',
  'fr-CA',
  'fr-FR',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'pt-BR'
];

/**
 * Defines google assistant class
 */
class GoogleAssistant {
  /**
   * Constructor
   * @param {String} token
   * @param {String} locale
   * @param {Object} location
   */
  constructor(token, locale, location) {
    this.client = this._createClient(token);
    this.locale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en-US';
    this.deviceLocation = location;
    this.deviceModelId = GOOGLE_PROJECT_ID;
    this.deviceInstanceId = GOOGLE_PROJECT_ID;
  }

  /**
   * Returns new embedded assistant client object
   * @param  {String} token
   * @return {Object}
   */
  _createClient(token) {
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: token });
    const sslCreds = grpc.credentials.createSsl();
    const callCreds = grpc.credentials.createFromGoogleCredential(oauth2Client);
    const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds, callCreds);
    return new EmbeddedAssistant(GOOGLE_ASSISTANT_API_ENDPOINT, combinedCreds);
  }

  /**
   * Returns assist response temporary stream file path and supplemental text for a given input text query
   * @param  {String} input
   * @param  {Object} attributes
   * @return {Promise}
   */
  query(input, attributes) {
    const now = new Date().getTime() / 1000;
    let conversationState = Buffer.alloc(0);

    // Define assist request object
    //  https://developers.google.com/assistant/sdk/reference/rpc/google.assistant.embedded.v1alpha2#assistrequest
    const request = {
      config: {
        text_query: input,
        audio_out_config: {
          encoding: 1,
          volume_percentage: 100,
          sample_rate_hertz: 16000
        },
        dialog_state_in: {
          language_code: this.locale,
          is_new_conversation: true
        },
        device_config: {
          device_id: this.deviceModelId,
          device_model_id: this.deviceInstanceId
        }
      }
    };

    // Add conversation state if defined in attributes
    if (attributes.conversationState) {
      const isNewConversation = now - attributes.lastQueryTime >= NEW_CONVERSATION_TIME_LAPSE;
      console.log('Prior conversation detected and expired:', isNewConversation);
      conversationState = Buffer.from(attributes.conversationState);
      request.config.dialog_state_in.conversation_state = conversationState;
      request.config.dialog_state_in.is_new_conversation = isNewConversation;
    } else {
      console.log('No prior conversation');
    }

    // Add device location if available
    if (this.deviceLocation) {
      request.config.dialog_state_in.device_location = this.deviceLocation;
    }

    console.log('Assist request:', JSON.stringify(request));

    return new Promise((resolve, reject) => {
      let audioLength = 0;
      let audioPresent = false;
      let responseText;

      // Create assist conversation
      const conversation = this.client.assist();
      // Define response temporary file path
      const responseFile = path.join(os.tmpdir(), 'response.pcm');
      // Create response pcm stream
      const responseStream = fs.createWriteStream(responseFile, { flags: 'w' });

      // Set a timer to timeout after 9 seconds
      const timer = setTimeout(() => {
        if (!audioPresent) {
          reject(new Error('Response timeout from the Google Assistant API'));
        }
      }, 9000);

      responseStream.on('finish', () => {
        console.log('Response pcm stream finished');

        // Cancel timer
        clearTimeout(timer);

        const stats = fs.statSync(responseFile);
        const fileSizeInBytes = stats.size;

        console.log('Response files size is', fileSizeInBytes);

        // Resolve with response file path and text if stream has any content, otherwise reject when no audio
        if (fileSizeInBytes > 0) {
          resolve([responseFile, responseText]);
        } else {
          reject(new Error('No audio response received from the Google Assistant API'));
        }
      });

      conversation.on('data', (response) => {
        if (process.env.DEBUG === 'true') console.debug('Assist response:', JSON.stringify(response));

        // Parse assist response object
        //  https://developers.google.com/assistant/sdk/reference/rpc/google.assistant.embedded.v1alpha2#assistresponse
        if (response.dialog_state_out) {
          console.log('Dialog state out received');

          if (response.dialog_state_out.supplemental_display_text) {
            responseText = response.dialog_state_out.supplemental_display_text;
            console.log('Supplemental text is:', responseText);
          }

          if (response.dialog_state_out.microphone_mode) {
            if (response.dialog_state_out.microphone_mode === 'CLOSE_MICROPHONE') {
              console.log('Closing microphone');
              attributes.microphoneOpen = false;
            } else if (response.dialog_state_out.microphone_mode === 'DIALOG_FOLLOW_ON') {
              console.log('Keeping microphone open');
              attributes.microphoneOpen = true;
            }
          }

          if (response.dialog_state_out.conversation_state) {
            if (response.dialog_state_out.conversation_state.length > 0) {
              conversationState = response.dialog_state_out.conversation_state;
              if (process.env.DEBUG === 'true') console.debug('Conversation state changed to:', conversationState);
              attributes.conversationState = conversationState.toString();
              attributes.lastQueryTime = parseInt(now);
            }
          }
        }

        // Store audio data if available
        if (response.audio_out) {
          const audio_chunk = response.audio_out.audio_data;

          if (audio_chunk instanceof Buffer) {
            audioLength += audio_chunk.length;

            if (!audioPresent) {
              audioPresent = true;
            }

            // Limit the total mp3 length to 90 seconds due to alexa api requirement
            //  (Seconds x Bits per sample x samples per second / 8 to give bytes per second)
            if (audioLength <= (90 * 16 * 16000) / 8) {
              responseStream.write(audio_chunk);
            } else {
              console.log('Ignoring audio data as it is longer than 90 seconds.');
            }
          }
        }
      });

      conversation.on('end', () => {
        console.log('Assist conversation ended');
        // Close response stream
        responseStream.end();
      });

      conversation.on('error', (error) => {
        console.error('Got a Google Assistant error:', error);
        reject(new Error('Error returned from the Google Assistant API.'));
      });

      conversation.write(request);
      conversation.end();
    });
  }
}

module.exports = GoogleAssistant;

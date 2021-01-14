'use strict';

const { google } = require('googleapis');
const { getProtoPath } = require('google-proto-files');

const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
const Stream = require('stream');
const Volume = require('pcm-volume');

const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const lame = require('@suldashi/lame');
const request = require('request');
const xmlescape = require('xml-escape');
const protoLoader = require('@grpc/proto-loader');

// Load AWS credentials
const s3 = new AWS.S3();

// Get Google Credentials from Environment Variables - these are set in the Lambda function configuration

const API_ENDPOINT = process.env.API_ENDPOINT;
const APP_ID = process.env.SKILL_ID;
const S3_BUCKET = process.env.S3_BUCKET;
const TABLE_NAME = process.env.TABLE_NAME;

const protoDefinition = protoLoader.loadSync('google/assistant/embedded/v1alpha2/embedded_assistant.proto', {
    includeDirs: [getProtoPath('..')],
    enums: String,
    longs: String,
    defaults: true,
    keepCase: true,
    oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(protoDefinition);
const assistantClient = protoDescriptor.google.assistant.embedded.v1alpha2.EmbeddedAssistant;

const clientState = {
    locale: undefined,
    s3Config: undefined,
    projectId: undefined,
    registered: false,
    initialized: false,
    oauth2Client: undefined,
    deviceLocation: undefined,
};

// Supported locales
//  https://developers.google.com/assistant/sdk/reference/rpc/languages
const SUPPORTED_LOCALES = [
  'de-DE', 'en-AU', 'en-CA', 'en-GB', 'en-IN', 'en-US', 'es-ES', 'es-MX',
  'fr-CA', 'fr-FR', 'it-IT', 'ja-JP', 'ko-KR', 'pt-BR'
];

function getSecretParams() {
    const s3Params = {
        Bucket: S3_BUCKET,
        Key: 'client_secret.json',
    };

    console.log('Getting JSON');

    return new Promise((resolve, reject) => {
        s3.getObject(s3Params, function (err, data) {
            if (err) {
                return reject(new Error('I could not load the client secret file from S3.'));
            }

            console.log('Current ConfigJSON:', JSON.stringify(clientState.s3Config));
            const s3Config = JSON.parse(Buffer.from(data.Body).toString('utf8'));

            if (!s3Config.hasOwnProperty('web')) {
                return reject(new Error('The client secret file was not configured for a web based client.'));
            }

            console.log('S3 Config is loaded:', JSON.stringify(s3Config));

            const clientId = s3Config.web.client_id;
            const redirectUri = s3Config.web.redirect_uris[0];
            const clientSecret = s3Config.web.client_secret;

            clientState.s3Config = s3Config;
            clientState.projectId = s3Config.web.project_id;
            clientState.registered = !!s3Config.registered;
            clientState.initialized = true;
            clientState.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
            clientState.deviceLocation = s3Config.device_location;

            return resolve();
        });
    });
}

async function registerProject(scope$) {
    console.log('Project registration started.');

    if (clientState.registered) {
        console.warn('Project is already registered.');
        return;
    }

    if (!clientState.initialized) {
        try {
            await getSecretParams();
        } catch (err) {
            console.error('Loading of SecretParams failed: ' + err);
            throw err;
        }
    }

    // This isn't massively efficient code but it only needs to run once!
    const ACCESS_TOKEN = scope$.event.context.System.user.accessToken;

    console.log('Access Token:', ACCESS_TOKEN);

    // Authenticate against Google OAUTH2
    clientState.oauth2Client.setCredentials({ access_token: ACCESS_TOKEN });

    const registrationModelURL = 'https://embeddedassistant.googleapis.com/v1alpha2/projects/' + clientState.projectId + '/deviceModels/';
    const registrationInstanceURL = 'https://embeddedassistant.googleapis.com/v1alpha2/projects/' + clientState.projectId + '/devices/';

    // Create Stub
    const bearer = 'Bearer ' + ACCESS_TOKEN;

    // Registering Model
    const registerModel = function (callback) {
        const deviceModel = {
            project_id: clientState.projectId,
            device_model_id: clientState.projectId,
            manifest: {
                manufacturer: 'Assistant SDK developer',
                product_name: 'Alexa Assistant v1',
                device_description: 'Alexa Assistant Skill v1',
            },
            device_type: 'action.devices.types.LIGHT',
            traits: ['action.devices.traits.OnOff'],
        };
        const postOptions = {
            url: registrationModelURL,
            method: 'POST',
            headers: {
                Authorization: bearer,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(deviceModel),
        };
        request(postOptions, function (error, response, body) {
            if (error) {
                callback(error, null);
            } else if (response) {
                const bodyJSON = JSON.parse(body);

                if (bodyJSON.error) {
                    console.log('error code received');

                    if (bodyJSON.error.code === 409) {
                        console.log('Model already exists');
                        callback(null, bodyJSON);
                    } else {
                        callback(bodyJSON, null);
                    }
                } else {
                    callback(null, bodyJSON);
                }
            }
        });
    };
    // Registering instance
    const registerInstance = function (callback) {
        const instanceModel = {
            id: clientState.projectId,
            model_id: clientState.projectId,
            nickname: 'Alexa Assistant v1',
            clientType: 'SDK_SERVICE',
        };
        const postOptions = {
            url: registrationInstanceURL,
            method: 'POST',
            headers: {
                Authorization: bearer,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(instanceModel),
        };
        request(postOptions, function (error, response, body) {
            if (error) {
                callback(error, null);
            } else if (response) {
                const bodyJSON = JSON.parse(body);

                if (bodyJSON.error) {
                    console.log('error code received');

                    if (bodyJSON.error.code === 409) {
                        console.log('Instance already exists');
                        callback(null, bodyJSON);
                    } else {
                        callback(bodyJSON, null);
                    }
                } else {
                    callback(null, bodyJSON);
                }
            }
        });
    };
    return new Promise((resolve, reject) => {
        // lets register the model and instance - we only need to do this once
        registerModel(function (err, result) {
            if (err) {
                console.log('Got Model register error', err);
                return reject(new Error('There was an error registering the Model with the Google API.'));
            } else if (result) {
                console.log('Got positive model response:', JSON.stringify(result));
                registerInstance(function (err, result) {
                    if (err) {
                        console.log('Error:', err);
                        return reject(new Error('There was an error registering the Instance with the Google API.'));
                    }

                    console.log('Got positive Instance response');

                    const s3Body = {
                        ...clientState.s3Config,
                        registered: true,
                    };
                    const s3Params = {
                        Bucket: S3_BUCKET,
                        Key: 'client_secret.json',
                        Body: JSON.stringify(s3Body),
                        ContentType: 'application/json',
                    };

                    s3.upload(s3Params, function (err) {
                        if (err) {
                            return reject(new Error('There was an error uploading to S3.'));
                        }

                        clientState.s3Config = s3Body;
                        scope$.attributes['microphone_open'] = false;

                        return resolve();
                    });
                });
            }
        });
    });
}

function createGrpcGoogleCreds() {
    return grpc.credentials.combineChannelCredentials(grpc.credentials.createSsl(null), grpc.credentials.createFromGoogleCredential(clientState.oauth2Client));
}

function executeAssist(token, audioState, scope$) {
    let audioLength = 0;
    let audioPresent = false;
    let overrideLocale = 'en-US';
    let conversationState = Buffer.alloc(0);

    console.log('Locale is:', clientState.locale);

    if (SUPPORTED_LOCALES.includes(clientState.locale)) {
        overrideLocale = clientState.locale;
    }

    // Update access token
    clientState.oauth2Client.setCredentials({ access_token: token });

    const grpcCreds = createGrpcGoogleCreds();
    const assistant = new assistantClient(API_ENDPOINT, grpcCreds);

    // create a timed event in case something causes the skill to stall
    // This will stop the skill from timing out
    setTimeout(function () {
        if (!audioPresent) {
            scope$.emit(':tell', "I wasn't able to talk to Google - please try again");
        }
    }, 9000);

    // create file into which we will stream pcm response from Google
    // Closing the stream into this file will trigger encoding into MP3
    console.log('Creating temp response file');

    let responseFile = fs.createWriteStream('/tmp/response.pcm', { flags: 'w' });

    responseFile.on('finish', function () {
        console.log('temp response file has been written');

        const stats = fs.statSync('/tmp/response.pcm');
        const fileSizeInBytes = stats.size;

        console.log('files size is', fileSizeInBytes);

        // Check whether response file has any content. If it doesn't then we have a response with no audio
        if (fileSizeInBytes > 0) {
            // encode MP3
            executeEncode(audioState, scope$);
        } else {
            // Save setting and exit
            console.log('Emitting blank sound');
            scope$.emit(':tell', "I didn't get an audio response from the Google Assistant");
        }
    });

    // Create Audio Configuration before we send any commands
    // We are using linear PCM as the input and output type so encoding value is 1
    console.log('Creating Audio config');

    const assistRequest = {
        config: {
            text_query: audioState.alexaUtteranceText,
            audio_out_config: {
                encoding: 1,
                volume_percentage: 100,
                sample_rate_hertz: 16000,
            },
            dialog_state_in: {
                language_code: overrideLocale,
                device_location: clientState.deviceLocation,
                is_new_conversation: true,
            },
            device_config: {
                device_id: clientState.projectId,
                device_model_id: clientState.projectId,
            },
        },
    };

    if (scope$.attributes['CONVERSATION_STATE']) {
        console.log('Prior ConverseResponse detected');
        conversationState = Buffer.from(scope$.attributes['CONVERSATION_STATE']);
        assistRequest.config.dialog_state_in.conversation_state = conversationState;
        assistRequest.config.dialog_state_in.is_new_conversation = false;
    } else {
        console.log('No prior ConverseResponse');
    }

    console.log('Current ConversationState is', conversationState);
    console.log('AssistRequest:', JSON.stringify(assistRequest));

    const conversation = assistant.Assist();

    conversation.on('error', function (err) {
        console.log('***There was a Google error***' + err);
        scope$.emit(':tell', 'The Google API returned an error.');
        // Clear conversation state
        scope$.attributes['CONVERSATION_STATE'] = undefined;
    });

    conversation.on('end', function () {
        console.log('End of response from GRPC stub');
        // Close response file which will then trigger encode
        responseFile.end();
        // Clear conversation state
        scope$.attributes['CONVERSATION_STATE'] = undefined;
    });

    conversation.on('data', function (response) {
        console.log('AssistResponse:', JSON.stringify(response));

        // Check there is actually a value in result
        if (response.dialog_state_out) {
            console.log('Dialog state out received');

            if (response.dialog_state_out.supplemental_display_text) {
                audioState.googleResponseText += xmlescape(JSON.stringify(response.dialog_state_out.supplemental_display_text));
                console.log('Supplemental text is:', audioState.googleResponseText);
            }

            if (response.dialog_state_out.microphone_mode) {
                if (response.dialog_state_out.microphone_mode === 'CLOSE_MICROPHONE') {
                    audioState.microphoneOpen = false;
                    scope$.attributes['microphone_open'] = false;
                    console.log('closing microphone');
                } else if (response.dialog_state_out.microphone_mode === 'DIALOG_FOLLOW_ON') {
                    audioState.microphoneOpen = true;
                    scope$.attributes['microphone_open'] = true;
                    console.log('keeping microphone open');
                }
            }

            if (response.dialog_state_out.conversation_state) {
                if (response.dialog_state_out.conversation_state.length > 0) {
                    console.log('Conversation state changed');
                    conversationState = response.dialog_state_out.conversation_state;
                    console.log('Conversation state var is', conversationState);
                    scope$.attributes['CONVERSATION_STATE'] = conversationState.toString();
                }
            }
        }

        // Deal with audio data from API
        if (response.audio_out) {
            //console.log('audio received')
            const audio_chunk = response.audio_out.audio_data;

            if (audio_chunk instanceof Buffer) {
                audioLength += audio_chunk.length;

                if (!audioPresent) {
                    audioPresent = true;
                }

                // Total length of MP3's in alexa skills must be less than 90 seconds.
                if (audioLength <= (90 * 16 * 16000) / 8) {
                    // Seconds x Bits per sample x samples per second / 8 to give bytes per second
                    responseFile.write(audio_chunk);
                } else {
                    // we won't write any more timestamps
                    console.log('Ignoring audio data as it is longer than 90 seconds');
                }
            }
        }
    });

    conversation.write(assistRequest);
    conversation.end();
}

// This function takes the response from the API and re-encodes using LAME
// There is lots of reading and writing from temp files which isn't ideal
// but I couldn't get piping to/from LAME work reliably in Lambda
function executeEncode(audioState, scope$) {
    console.log('Starting Transcode');

    // Read the linear PCM response from file and create stream
    const readpcm = fs.createReadStream('/tmp/response.pcm');

    readpcm.on('end', function () {
        console.log('pcm stream read complete');
    });

    // Create file to which MP3 will be written
    const writemp3 = fs.createWriteStream('/tmp/response.mp3');

    // Log when MP3 file is written
    writemp3.on('finish', function () {
        console.log('mp3 has been written');
        // Create read stream from MP3 file
        const readmp3 = fs.createReadStream('/tmp/response.mp3');
        // Pipe to S3 upload function
        readmp3.pipe(uploadFromStream(s3));
    });

    // Create LAME encoder instance
    const encoder = new lame.Encoder({
        // input
        channels: 1, // 1 channels (MONO)
        bitDepth: 16, // 16-bit samples
        sampleRate: 16000, // 16,000 Hz sample rate
        // output
        bitRate: 48,
        outSampleRate: 16000,
        mode: lame.JOINTSTEREO, // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
    });

    // The output from the google assistant is much lower than Alexa so we need to apply a gain
    const vol = new Volume();

    // Set volume gain on google output to be +75%
    // Any more than this then we risk major clipping
    vol.setVolume(1.75);

    // Create function to upload MP3 file to S3
    function uploadFromStream(s3) {
        const pass = new Stream.PassThrough();
        const filename = scope$.event.session.user.userId;
        const params = { Bucket: S3_BUCKET, Key: filename, Body: pass };

        s3.upload(params, function (err, data) {
            if (err) {
                console.log('S3 upload error:', err);
                scope$.emit(':tell', 'There was an error uploading to S3. ');
            } else {
                // Upload has been successful - we can know issue an alexa response based upon microphone state
                let signedURL;
                // create a signed URL to the MP3 that expires after 5 seconds - this should be plenty of time to allow alexa to load and cache mp3
                const signedParams = {
                    Bucket: S3_BUCKET,
                    Key: filename,
                    Expires: 10,
                    ResponseContentType: 'audio/mpeg',
                };

                s3.getSignedUrl('getObject', signedParams, function (err, url) {
                    if (url) {
                        // escape out any illegal XML characters;
                        url = xmlescape(url);
                        signedURL = url;

                        // if response text is blank just add a speaker icon to response
                        if (!audioState.googleResponseText) {
                            audioState.googleResponseText = '"🔊"';
                        }

                        // remove any REPEAT AFTER ME form alexa utterance
                        const cleanUtterance = audioState.alexaUtteranceText.replace('REPEAT AFTER ME ', '');
                        let cardContent = 'Request:<br/><i>' + cleanUtterance + '</i><br/><br/>Supplemental Response:<br/>' + audioState.googleResponseText;

                        // replace carriage returns with breaks
                        cardContent = cardContent.replace(/\\n/g, '<br/>');

                        // deal with any \&quot;
                        cardContent = cardContent.replace(/\\&quot;/g, '&quot;');

                        console.log(cardContent);

                        const cardTitle = 'Google Assistant for Alexa';

                        // Let remove any (playing sfx)
                        cardContent = cardContent.replace(/(\(playing sfx\))/g, '🔊');

                        const speechOutput = '<audio src="' + signedURL + '"/>';
                        const template = {
                            type: 'BodyTemplate1',
                            token: 'bt1',
                            backButton: 'HIDDEN',
                            title: cardTitle,
                            textContent: {
                                primaryText: {
                                    text: cardContent,
                                    type: 'RichText',
                                },
                            },
                        };

                        scope$.response.speak(speechOutput);

                        if (scope$.event.context.System.device.supportedInterfaces.Display) {
                            scope$.response.renderTemplate(template);
                        }

                        // If API has requested Microphone to stay open then will create an Alexa 'Ask' response
                        // We also keep the microphone on the launch intent 'Hello' request as for some reason the API closes the microphone
                        if (audioState.microphoneOpen || audioState.alexaUtteranceText === 'Hello') {
                            console.log('Microphone is open so keeping session open');
                            scope$.response.listen(' ');
                            scope$.emit(':responseReady');
                        } else {
                            // Otherwise we create an Alexa 'Tell' command which will close the session
                            console.log('Microphone is closed so closing session');
                            scope$.response.shouldEndSession(true);
                            scope$.emit(':responseReady');
                        }
                    } else {
                        scope$.emit(':tell', 'There was an error creating the signed URL.');
                    }
                });
            }
        });
        return pass;
    }

    // When encoding of MP3 has finished we upload the result to S3
    encoder.on(
        'finish',
        function () {
            // Close the MP3 file
            setTimeout(function () {
                console.error('Encoding done!');
                console.error('Streaming mp3 file to s3');
                writemp3.end();
            });
        },
        1000
    );

    // Pipe output of PCM file reader to the gain process
    readpcm.pipe(vol);

    // pipe the pcm output of the gain process to the LAME encoder
    vol.pipe(encoder);

    // Pipe output of LAME encoder into MP3 file writer
    encoder.pipe(writemp3);
}

const handlers = {
    LaunchRequest: async function () {
        const scope$ = this;

        if (!scope$.event.context.System.user.accessToken) {
            scope$.emit(':tellWithLinkAccountCard', 'You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.');
        } else {
            try {
                await getSecretParams();
            } catch (err) {
                console.error('Loading of SecretParams failed: ' + err);
                scope$.emit(':tell', 'There was a problem loading the settings from the S3 Bucket.');
                throw err;
            }
            if (!clientState.registered) {
                try {
                    await registerProject(scope$);
                } catch (err) {
                    console.error('Client setup failed: ' + err);
                    scope$.emit(':tell', 'There was a problem setting up the project.');
                    throw err;
                }
                console.log('Registration Function Complete');
            }
        }
    },
    SearchIntent: async function (overrideText) {
        const scope$ = this;
        const audioState = {
            microphoneOpen: true,
            alexaUtteranceText: '',
            googleResponseText: '',
        };

        // Have we received an direct utterance from another intent?
        if (overrideText) {
            audioState.alexaUtteranceText = overrideText;
            console.log('Utterance received from another intent:', overrideText);
        } else {
            // use detected utterance
            audioState.alexaUtteranceText = scope$.event.request.intent.slots.search.value;
        }

        console.log(`Input text to be processed is "${audioState.alexaUtteranceText}"`);
        console.log('Starting Search Intent');

        const accessToken = scope$.event.context.System.user.accessToken;

        // Check whether we have a valid authentication token
        if (!accessToken) {
            // We haven't so create an account link card
            scope$.emit(':tellWithLinkAccountCard', 'You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.');
        } else {
            try {
                await getSecretParams();
            } catch (err) {
                console.error('Loading of SecretParams failed: ' + err);
                scope$.emit(':tell', 'There was a problem loading the settings from the S3 Bucket.');
                throw err;
            }
            if (!clientState.registered) {
                try {
                    await registerProject(scope$);
                } catch (err) {
                    console.error('Client setup failed: ' + err);
                    scope$.emit(':tell', 'There was a problem setting up the project.');
                    throw err;
                }
            }

            console.log('token:', accessToken);
            executeAssist(accessToken, audioState, this);
        }
    },
    Unhandled: function () {
        console.log('Unhandled event');
        this.emit(':ask', "I'm not sure what you said. Can you repeat please");
    },
    'AMAZON.StopIntent': function () {
        console.log('Stop Intent');
        if (this.attributes['microphone_open']) {
            this.emit('SearchIntent', 'stop');
        } else {
            this.emit(':tell', 'Stopped');
        }
    },
    'AMAZON.HelpIntent': function () {
        console.log('Help Intent');
        this.emit('SearchIntent', 'What can you do');
    },
    'AMAZON.CancelIntent': function () {
        console.log('Cancel Intent');
        if (this.attributes['microphone_open']) {
            this.emit('SearchIntent', 'cancel');
        } else {
            this.emit(':tell', 'Cancelled');
        }
    },
    'AMAZON.NoIntent': function () {
        console.log('No Intent');
        if (this.attributes['microphone_open']) {
            this.emit('SearchIntent', 'no');
        }
    },
    'AMAZON.YesIntent': function () {
        console.log('Yes Intent');
        if (this.attributes['microphone_open']) {
            this.emit('SearchIntent', 'yes');
        }
    },
    SessionEndedRequest: function () {
        console.log('Session ended request');
        console.log(`Session has ended with reason ${this.event.request.reason}`);
        // Google Assistant will keep the conversation thread open even if we don't give a response to an ask.
        // We need to close the conversation if an ask response is not given (which will end up here)
        // The easiest way to do this is to just send a goodbye command and this will close the conversation for us
        // (this is against Amazons guides but we're not submitting this!)
        if (this.attributes['microphone_open']) {
            this.emit('SearchIntent', 'goodbye');
        }
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context);
    clientState.locale = event.request.locale;
    alexa.appId = APP_ID;
    alexa.dynamoDBTableName = TABLE_NAME;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

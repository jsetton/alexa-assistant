'use strict';

const request = require('request');

// Get environment settings
const GOOGLE_ASSISTANT_API_ENDPOINT = process.env.GOOGLE_ASSISTANT_API_ENDPOINT;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

/**
 * Handles request
 * @param  {Object} options
 * @return {Promise}
 */
function handleRequest(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else if (response) {
        if (!body.error) {
          resolve(body);
        } else if (body.error.code === 409) {
          console.log('Model already exists');
          resolve(body);
        } else {
          console.error('Error code received');
          reject(body);
        }
      }
    });
  });
}

/**
 * Registers a device model
 * @param  {String} token
 * @return {Promise}
 */
function registerDevice(token) {
  const deviceModel = {
    project_id: GOOGLE_PROJECT_ID,
    device_model_id: GOOGLE_PROJECT_ID,
    manifest: {
      manufacturer: 'Assistant SDK developer',
      product_name: 'Alexa Assistant v1',
      device_description: 'Alexa Assistant Skill v1'
    },
    device_type: 'action.devices.types.LIGHT',
    traits: ['action.devices.traits.OnOff']
  };
  const options = {
    url: `https://${GOOGLE_ASSISTANT_API_ENDPOINT}/v1alpha2/projects/${GOOGLE_PROJECT_ID}/deviceModels/`,
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token
    },
    body: deviceModel,
    json: true
  };

  return handleRequest(options);
}

/**
 * Registers an instance model
 * @param  {String} token
 * @return {Promise}
 */
function registerInstance(token) {
  const instanceModel = {
    id: GOOGLE_PROJECT_ID,
    model_id: GOOGLE_PROJECT_ID,
    nickname: 'Alexa Assistant v1',
    clientType: 'SDK_SERVICE'
  };
  const options = {
    url: `https://${GOOGLE_ASSISTANT_API_ENDPOINT}/v1alpha2/projects/${GOOGLE_PROJECT_ID}/devices/`,
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token
    },
    body: instanceModel,
    json: true
  };

  return handleRequest(options);
}

/**
 * Registers project
 * @param  {String} token
 * @return {Promise}
 */
exports.register = async (token) => {
  console.log('Project registration started');

  // Register device
  try {
    await registerDevice(token);
    console.log('Got successful device model response');
  } catch (error) {
    console.error('Got model register error:', error);
    throw 'error.project_device';
  }
  // Register instance
  try {
    await registerInstance(token);
    console.log('Got successful instance model response');
  } catch (error) {
    console.error('Got instance register error:', error);
    throw 'error.project_instance';
  }
};

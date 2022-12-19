'use strict';

import fetch from 'node-fetch';

// Get environment settings
const GOOGLE_ASSISTANT_API_ENDPOINT = process.env.GOOGLE_ASSISTANT_API_ENDPOINT;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

/**
 * Handles request
 * @param  {String} url
 * @param  {String} token
 * @param  {Object} body
 * @return {Promise}
 */
const handleRequest = async (url, token, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    if (response.status === 409) {
      console.log('Model already exists');
    } else {
      console.error(`Error code ${response.status} received`);
      const { error } = await response.json();
      throw error;
    }
  }
};

/**
 * Registers a device model
 * @param  {String} token
 * @return {Promise}
 */
const registerDevice = (token) => {
  const url = `https://${GOOGLE_ASSISTANT_API_ENDPOINT}/v1alpha2/projects/${GOOGLE_PROJECT_ID}/deviceModels/`;
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

  handleRequest(url, token, deviceModel);
};

/**
 * Registers an instance model
 * @param  {String} token
 * @return {Promise}
 */
const registerInstance = (token) => {
  const url = `https://${GOOGLE_ASSISTANT_API_ENDPOINT}/v1alpha2/projects/${GOOGLE_PROJECT_ID}/devices/`;
  const instanceModel = {
    id: GOOGLE_PROJECT_ID,
    model_id: GOOGLE_PROJECT_ID,
    nickname: 'Alexa Assistant v1',
    clientType: 'SDK_SERVICE'
  };

  handleRequest(url, token, instanceModel);
};

/**
 * Registers project
 * @param  {String} token
 * @return {Promise}
 */
export const register = async (token) => {
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

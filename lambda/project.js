import fetch from 'node-fetch';

// Get environment settings
const GOOGLE_ASSISTANT_API_ENDPOINT = process.env.GOOGLE_ASSISTANT_API_ENDPOINT;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

/**
 * Handles request
 * @param  {String} urn
 * @param  {String} token
 * @param  {Object} parameters
 * @return {Promise}
 */
const handleRequest = (urn, token, parameters) => {
  const url = `https://${GOOGLE_ASSISTANT_API_ENDPOINT}/v1alpha2/projects/${GOOGLE_PROJECT_ID}/${urn}/`;
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(parameters)
  };
  return fetch(url, options).then(async (response) => {
    if (!response.ok) {
      if (response.status === 409) {
        console.log('Model already exists');
      } else {
        console.error(`Response code ${response.status} (${response.statusText})`);
        const { error } = await response.json();
        throw error;
      }
    }
  });
};

/**
 * Registers a device model
 * @param  {String} token
 * @return {Promise}
 */
const registerDevice = (token) => {
  const parameters = {
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
  return handleRequest('deviceModels', token, parameters);
};

/**
 * Registers an instance model
 * @param  {String} token
 * @return {Promise}
 */
const registerInstance = (token) => {
  const parameters = {
    id: GOOGLE_PROJECT_ID,
    model_id: GOOGLE_PROJECT_ID,
    nickname: 'Alexa Assistant v1',
    clientType: 'SDK_SERVICE'
  };
  return handleRequest('devices', token, parameters);
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

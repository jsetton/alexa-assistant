'use strict';

const Alexa = require('ask-sdk-core');

const { getGeoCoordinates } = require('./maps');

/**
 * Returns device country and postal code address object
 * @param  {Object}  handlerInput
 * @return {Promise}
 */
const getDeviceAddress = async (handlerInput) => {
  const deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
  const deviceAddressServiceClient = handlerInput.serviceClientFactory.getDeviceAddressServiceClient();
  const permissions = ['read::alexa:device:all:address:country_and_postal_code'];

  try {
    return await deviceAddressServiceClient.getCountryAndPostalCode(deviceId);
  } catch {
    console.error('Unable to get device address');
    handlerInput.responseBuilder.withAskForPermissionsConsentCard(permissions);
    throw new Error("The device country and postal code permission isn't granted. Please check the skill settings.");
  }
};

/**
 * Returns device location coordinates
 * @param  {Object}  handlerInput
 * @return {Promise}
 */
exports.getDeviceLocation = async (handlerInput) => {
  // Get device address country and postal code
  const address = await getDeviceAddress(handlerInput);
  console.log('Device address:', address);
  // Get device location coordinates
  const location = { coordinates: await getGeoCoordinates(`${address.countryCode},${address.postalCode}`) };
  console.log('Device location:', location);

  return location;
};

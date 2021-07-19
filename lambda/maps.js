'use strict';

const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client();

// Get environment settings
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Returns geo coordinates for a given address
 * @param  {String}  address
 * @return {Promise}
 */
exports.getGeoCoordinates = async (address) => {
  try {
    const { data } = await client.geocode({ params: { address, key: GOOGLE_MAPS_API_KEY } });
    const { lat: latitude, lng: longitude } = data.results[0].geometry.location;
    return { latitude, longitude };
  } catch (error) {
    console.log('Got google maps geocode error:', error);
    throw new Error('Failed to get google maps geocode coordinates');
  }
};

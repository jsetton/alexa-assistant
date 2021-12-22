'use strict';

const fs = require('fs');
const { PassThrough } = require('stream');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

// Get environment settings
const S3_BUCKET = process.env.S3_BUCKET;

/**
 * Uploads stream file to s3 and returns signed url
 * @param  {String}  streamFile
 * @param  {String}  keyName
 * @return {Promise}
 */
exports.uploadStreamFile = async (streamFile, keyName) => {
  // Create passthrough stream
  const pass = new PassThrough();
  // Create read stream from given file
  const readmp3 = fs.createReadStream(streamFile);
  // Pipe to passthrough stream
  readmp3.pipe(pass);

  // Upload passthrough stream to S3
  try {
    const params = {
      Bucket: S3_BUCKET,
      Key: keyName,
      Body: pass
    };
    await s3.upload(params).promise();
  } catch (error) {
    console.error('S3 upload error:', error);
    throw 'error.storage_upload';
  }

  // Get signed url from s3
  try {
    const params = {
      Bucket: S3_BUCKET,
      Key: keyName,
      Expires: 10,
      ResponseContentType: 'audio/mpeg'
    };
    const signedURL = await s3.getSignedUrlPromise('getObject', params);
    console.log('Signed URL:', signedURL);
    return signedURL;
  } catch (error) {
    console.error('Got s3 get signed url error:', error);
    throw 'error.storage_signed_url';
  }
};

'use strict';

const fs = require('fs');
const { PassThrough } = require('stream');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new S3Client({ region: process.env.AWS_REGION });

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
    const upload = new Upload({
      client,
      params: {
        Bucket: S3_BUCKET,
        Key: keyName,
        Body: pass
      }
    });
    await upload.done();
  } catch (error) {
    console.error('S3 upload error:', error);
    throw 'error.storage_upload';
  }

  // Get signed url from s3
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: keyName,
      ResponseContentType: 'audio/mpeg'
    });
    const signedURL = await getSignedUrl(client, command, { expiresIn: 10 });
    console.log('Signed URL:', signedURL);
    return signedURL;
  } catch (error) {
    console.error('Got s3 get signed url error:', error);
    throw 'error.storage_signed_url';
  }
};

import fs from 'node:fs';
import lame from '@flat/lame';
import Volume from 'pcm-volume';

/**
 * Returns encoded mp3 file path
 * @param  {String} pcmFile
 * @return {Promise}
 */
export const encode = (pcmFile) => {
  // This function takes the response from the API and re-encodes using LAME
  // There is lots of reading and writing from temp files which isn't ideal
  // but I couldn't get piping to/from LAME work reliably in Lambda
  console.log('Start encoding');

  // Define mp3 file path
  const mp3File = pcmFile.replace(/\.pcm$/, '.mp3');
  // Create stream to read the linear PCM response stream file
  const readpcm = fs.createReadStream(pcmFile);
  // Create stream to which MP3 will be written
  const writemp3 = fs.createWriteStream(mp3File);
  // Create LAME encoder instance
  const encoder = new lame.Encoder({
    // input
    channels: 1, // 1 channels (MONO)
    bitDepth: 16, // 16-bit samples
    sampleRate: 16000, // 16,000 Hz sample rate
    // output
    bitRate: 48,
    outSampleRate: 16000,
    mode: lame.JOINTSTEREO // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
  });
  // Create pcm volume instance to apply gain to the google assistant output since much lower than Alexa
  const vol = new Volume();
  // Set volume gain to be +75%
  vol.setVolume(1.75);

  return new Promise((resolve, reject) => {
    readpcm.on('end', () => {
      console.log('Read pcm stream complete');
    });

    readpcm.on('error', (error) => {
      console.error('Failed to read pcm stream:', error);
      reject('error.transcoder_encode');
    });

    encoder.on('finish', () => {
      console.log('Encode mp3 file complete');
    });

    encoder.on('error', (error) => {
      console.error('Failed to encode mp3 file:', error);
      reject('error.transcoder_encode');
    });

    writemp3.on('finish', () => {
      console.log('Write mp3 file complete');
      // Return mp3 file path
      resolve(mp3File);
    });

    writemp3.on('error', (error) => {
      console.error('Failed to write mp3 file:', error);
      reject('error.transcoder_encode');
    });

    // Pipe output of LAME encoder into MP3 file writer
    encoder.pipe(writemp3);

    // pipe the pcm output of the gain process to the LAME encoder
    vol.pipe(encoder);

    // Pipe output of PCM file reader to the gain process
    readpcm.pipe(vol);
  });
};

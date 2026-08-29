import fs from 'node:fs';
import lamejs from '@breezystack/lamejs';

/**
 * Returns encoded mp3 file path
 * @param  {String} pcmFile
 * @return {Promise}
 */
export const encode = async (pcmFile) => {
  console.log('Start encoding');

  // Define mp3 file path
  const mp3File = pcmFile.replace(/\.pcm$/, '.mp3');

  // Create LAME encoder instance
  const encoder = new lamejs.Mp3Encoder(1, 16000, 48);

  // Create streams to read and write the audio files
  const readpcm = fs.createReadStream(pcmFile);
  const writemp3 = fs.createWriteStream(mp3File);

  let leftover = Buffer.alloc(0);

  for await (let chunk of readpcm) {
    if (leftover.length) {
      chunk = Buffer.concat([leftover, chunk]);
      leftover = Buffer.alloc(0);
    }

    // PCM samples are 16-bit
    if (chunk.length % 2) {
      leftover = chunk.subarray(chunk.length - 1);
      chunk = chunk.subarray(0, chunk.length - 1);
    }

    const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2);

    // Apply +75% gain
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.max(-32768, Math.min(32767, samples[i] * 1.75));
    }

    const mp3buf = encoder.encodeBuffer(samples);

    if (mp3buf.length) {
      writemp3.write(Buffer.from(mp3buf));
    }
  }

  // Finish encoding
  const mp3buf = encoder.flush();

  if (mp3buf.length) {
    writemp3.write(Buffer.from(mp3buf));
  }

  writemp3.end();

  await new Promise((resolve, reject) => {
    writemp3.on('finish', resolve);
    writemp3.on('error', reject);
  });

  console.log('Write mp3 file complete');

  // Return mp3 file path
  return mp3File;
};

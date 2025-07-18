// // utils/chunk-uploader.js
// const axios = require('axios');

// const INDEXED_CP_URL = 'http://localhost:3000/upload';

// async function uploadChunkToIndexedCP(sessionId, chunk) {
//   try {
//     await axios.post(INDEXED_CP_URL, chunk, {
//       headers: {
//         'Content-Type': 'application/octet-stream',
//         'X-UUID': sessionId
//       },
//       maxContentLength: Infinity,
//       maxBodyLength: Infinity
//     });
//   } catch (err) {
//     console.error('❌ IndexedCP chunk upload error:', err.message);
//   }
// }

// module.exports = {
//   uploadChunkToIndexedCP
// };
const { PassThrough } = require('stream');
const { bufferAndUpload } = require('indexedcp/client');

async function uploadChunkToIndexedCP(sessionId, gstProcess) {
  const streamId = sessionId; // or uuidv4() if you prefer a new one
  const passthrough = new PassThrough();

  // Pipe GStreamer stdout to the PassThrough stream
  gstProcess.stdout.pipe(passthrough);

  try {
    await bufferAndUpload({
      stream: passthrough,
      streamId,
      extension: 'opus', // change if you use a different format
    });
    console.log(`🎧 [${sessionId}] Audio stream uploaded to IndexedCP`);
  } catch (err) {
    console.error(`❌ Failed to upload audio for room ${sessionId}:`, err);
    // You can add retry logic here in a later step
  }
}

module.exports = {
  uploadChunkToIndexedCP
};
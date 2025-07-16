// utils/chunk-uploader.js
const axios = require('axios');

const INDEXED_CP_URL = 'http://localhost:9000/upload';

async function uploadChunkToIndexedCP(streamId, chunk) {
  try {
    await axios.post(INDEXED_CP_URL, chunk, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-UUID': sessionId
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  } catch (err) {
    console.error('❌ IndexedCP chunk upload error:', err.message);
  }
}

module.exports = {
  uploadChunkToIndexedCP
};

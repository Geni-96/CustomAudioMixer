// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { launchMixerPipeline } = require('./mixer');

const app = express();
const PORT = 8000;

app.use(bodyParser.json());

app.post('/mixer/start', async (req, res) => {
  const { sessionId, roomId, ports } = req.body;

  if (!sessionId || !roomId || !Array.isArray(ports) || ports.length === 0) {
    return res.status(400).json({ error: 'Missing sessionId, roomId or ports' });
  }

  console.log(`🛰️  Received mixer handshake: session=${sessionId}, room=${roomId}`);
  console.log(`🎧  Incoming RTP ports: ${ports.map(p => p.port).join(', ')}`);

  try {
    await launchMixerPipeline(sessionId, roomId, ports);
    res.status(200).json({ message: 'Mixer pipeline launched' });
  } catch (err) {
    console.error('Failed to start mixer pipeline:', err);
    res.status(500).json({ error: 'Failed to start mixer' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mixer server listening on port ${PORT}`);
});

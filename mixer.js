// mixer.js
const { spawn } = require('child_process');
const path = require('path');
const { uploadChunkToIndexedCP } = require('./utils/chunk-uploader');

const launchMixerPipeline = async (sessionId, roomId, ports) => {
  if (!ports || ports.length === 0) throw new Error('No ports provided');

  const pipelineArgs = [];

  const mixName = 'mix';
  const caps = 'application/x-rtp,media=audio,encoding-name=OPUS,payload=96';

  ports.forEach((p, i) => {
    const srcName = `src${i}`;
    pipelineArgs.push(
      `udpsrc port=${p.port} caps="${caps}"`,
      `! rtpopusdepay ! opusdec ! audioconvert ! queue ! ${mixName}.`
    );
  });

  const mixerConfig = [
    `audiomixer name=${mixName}`,
    `${mixName}. ! audioconvert ! audioresample ! opusenc ! queue ! filesink location=/dev/stdout`
  ];


  const fullPipeline = [...pipelineArgs, ...mixerConfig].join(' ');

  console.log(`🎛️ Launching GStreamer pipeline for room: ${roomId}`);
  const gstProcess = spawn('gst-launch-1.0', fullPipeline.split(' '), {
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: true
  });

  gstProcess.stdout.on('data', async (chunk) => {
    try {
      await uploadChunkToIndexedCP(sessionId, roomId, chunk);
    } catch (err) {
      console.error('❌ Failed to upload chunk to IndexedCP:', err);
    }
  });

  gstProcess.on('exit', (code) => {
    console.log(`🔚 GStreamer pipeline for room ${roomId} exited with code ${code}`);
  });
};

module.exports = { launchMixerPipeline };

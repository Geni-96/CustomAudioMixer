// public/client.js
let socket;
let audioContext;
let workletNode;
let input;
let stream;
let participantId = 'browser-' + Math.random().toString(36).substr(2, 9);
let mixedChunks = [];

const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const pauseBtn = document.getElementById('pause');
const resumeBtn = document.getElementById('resume');

startBtn.onclick = async () => {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  socket = io();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
  await audioContext.audioWorklet.addModule('audio-worklet-processor.js');
  input = audioContext.createMediaStreamSource(stream);
  workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
  input.connect(workletNode);
  workletNode.connect(audioContext.destination);
  workletNode.port.onmessage = (event) => {
    const buf = new Uint8Array(event.data);
    socket.emit('audio-chunk', {
      participantId,
      chunk: buf
    });
  };
  mixedChunks = [];
  socket.on('mixed-audio', (chunk) => {
    mixedChunks.push(new Uint8Array(chunk));
  });
};

pauseBtn.onclick = () => {
  if (stream && input && workletNode) {
    input.disconnect(workletNode);
    stream.getAudioTracks().forEach(track => track.enabled = false);
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
  }
};

resumeBtn.onclick = () => {
  if (stream && input && workletNode) {
    input.connect(workletNode);
    stream.getAudioTracks().forEach(track => track.enabled = true);
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
  }
};

stopBtn.onclick = () => {
  startBtn.disabled = false;
  stopBtn.disabled = true;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  if (workletNode) workletNode.disconnect();
  if (input) input.disconnect();
  if (audioContext) audioContext.close();
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (socket) socket.disconnect();
  // Assemble WAV and play
  if (mixedChunks.length > 0) {
    const audioBlob = createWavBlob(mixedChunks, 48000, 1, 16);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audioElem = document.getElementById('mixedAudio');
    audioElem.src = audioUrl;
    audioElem.style.display = 'block';
    audioElem.load();
    audioElem.play();
  }
};

function createWavBlob(chunks, sampleRate, channels, bitDepth) {
  const dataLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
  const wavHeader = createWavHeader(dataLength, sampleRate, channels, bitDepth);
  const audioBuffer = new Uint8Array(dataLength);
  let offset = 0;
  for (const chunk of chunks) {
    audioBuffer.set(chunk, offset);
    offset += chunk.length;
  }
  const blob = new Blob([wavHeader, audioBuffer], { type: 'audio/wav' });
  return blob;
}

function createWavHeader(dataLength, sampleRate, channels, bitDepth) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bitDepth / 8, true);
  view.setUint16(32, channels * bitDepth / 8, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  return header;
}

// audio-mixer-server/index.js
// Node.js server to receive and mix audio streams from mediasoup

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the frontend from the public directory
app.use(express.static(__dirname + '/public'));

// Store incoming audio chunks per participant
const audioBuffers = {};

// Store the order of received chunks
let chunkQueue = [];

// Store mixed audio chunks
let mixedAudioChunks = [];

// Simple PCM mixing function
function mixAudioChunks(chunks) {
    if (chunks.length === 0) return null;
    // Assume all chunks are Buffer of same length, 16-bit signed PCM
    const length = chunks[0].length;
    const mixed = Buffer.alloc(length);
    for (let i = 0; i < length; i += 2) {
        let sum = 0;
        for (const chunk of chunks) {
            sum += chunk.readInt16LE(i);
        }
        // Normalize and clamp
        sum = Math.max(Math.min(sum, 32767), -32768);
        mixed.writeInt16LE(sum, i);
    }
    return mixed;
}

io.on('connection', (socket) => {
    console.log('Participant connected:', socket.id);

    socket.on('audio-chunk', (data) => {
        // data: { participantId, chunk (Buffer) }
        if (!audioBuffers[data.participantId]) {
            audioBuffers[data.participantId] = [];
        }
        audioBuffers[data.participantId].push(data.chunk);
        chunkQueue.push({ participantId: data.participantId, chunk: data.chunk });
        processChunks();
    });

    socket.on('disconnect', () => {
        delete audioBuffers[socket.id];
        console.log('Participant disconnected:', socket.id);
    });
});

function processChunks() {
    // Process chunks in the order received
    while (chunkQueue.length > 0) {
        const { chunk } = chunkQueue.shift();
        // For demo: mix all latest chunks from all participants
        const latestChunks = Object.values(audioBuffers).map(bufArr => bufArr.shift()).filter(Boolean);
        if (latestChunks.length > 0) {
            const mixed = mixAudioChunks(latestChunks);
            if (mixed) {
                // Emit mixed audio to all clients
                io.emit('mixed-audio', mixed);
                mixedAudioChunks.push(mixed);
            }
        }
    }
}

app.get('/download-mixed-audio', (req, res) => {
    if (mixedAudioChunks.length === 0) {
        return res.status(404).send('No mixed audio available.');
    }
    // Concatenate all mixed chunks
    const audioBuffer = Buffer.concat(mixedAudioChunks);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', 'attachment; filename="mixed_audio.wav"');
    // Write a simple WAV header (16-bit PCM, mono, 48kHz)
    const wavHeader = createWavHeader(audioBuffer.length, 48000, 1, 16);
    res.write(wavHeader);
    res.end(audioBuffer);
});

function createWavHeader(dataLength, sampleRate, channels, bitDepth) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size
    header.writeUInt16LE(1, 20); // AudioFormat (PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28);
    header.writeUInt16LE(channels * bitDepth / 8, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    return header;
}

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Audio mixer server running on port ${PORT}`);
});

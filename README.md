## 🎛️ Scalable Audio Mixer for Mediasoup with GStreamer

### 📌 Overview

This project implements a scalable, backend audio mixer that:

- Receives multiple RTP audio streams from mediasoup via PlainTransport.
- Dynamically creates a GStreamer pipeline per room/call.
- Mixes all incoming streams into a single audio stream.
- Streams the mixed output to IndexedCP using sessionId, roomId, or other metadata to    uniquely identify each stream.

### 🧱 Architecture

'''
[Mediasoup Producers] ──▶ [PlainTransport RTP] ──▶ [GStreamer Mixer]
                                                 └────▶ [IndexedCP Upload]
'''

#### Mediasoup app:
- Starts transcriptions with startTranscriptions event.
- Sends RTP streams from all users in the room to the mixer app.
- Includes unique session/room metadata in handshake.
#### Mixer app:
- Listens on RTP ports for each user.
- Dynamically creates a pipeline per room.
- Mixes audio using audiomixer.
- Pushes chunks to IndexedCP using the given identifiers.

### ⚙️ Requirements

Node.js (for signaling and pipeline orchestration)
GStreamer (gst-launch-1.0, gst bindings, gst-python or system install)
IndexedCP module running (with upload endpoint configured)

### 🚀 Scaling

- One GStreamer pipeline per room/session.
- Can be forked or containerized to isolate processing.
- Mediasoup can handle multiple simultaneous PlainTransports.
- Mixer can be extended to use worker pools or clustering.
# Simple Vue P2P chat

A deliberately small Vue/Vite example for opening a PeerJS data channel,
sending text messages, and noticing when the other browser disconnects.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:4200> in two browser tabs or windows.

1. Each browser gets its own **Your ID**.
2. Copy one ID into the other browser's **Someone else's ID** field.
3. Press **Connect**.
4. Once both sides say **Connected**, send text messages.
5. Press **Disconnect**, close a tab, or reload it to see the channel close in
   the other browser.

Open the browser developer console to see the same connection events and
received messages logged there.

## What is happening?

`peerjs` connects to this signalling service:

```text
host: p2p.blackthornwinter.com
port: 443
path: /rtc
key:  peerjs
```

PeerJS uses secure WebSockets for signalling. After the connection is set up,
the chat text travels directly between the two browsers over a WebRTC data
channel.

The service intentionally accepts this example from exactly
`http://localhost:4200` (or `http://127.0.0.1:4200`), so the Vite port is fixed
in `vite.config.js`.

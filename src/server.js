#!/usr/bin/env node

const http = require('http');

const app = require('./index');
const { wss } = require('./websocket');
const config = require('./config/index');

if (config.startWithStudio) {
  (async () => {
    const { handler: soulStudioHandler } = await import(
      'soul-studio/build/handler.js'
    );
    app.use('/studio', soulStudioHandler);
  })();
}

const server = http.createServer(app);

const port = config.port;

const baseURL = `http://localhost:${port}`;
const coreURL = `${baseURL}/api/`;
const studioURL = `${baseURL}/studio/`;

server.listen(port, () => {
  console.log(`Soul is running...`);
  console.log(` > Core API at ${coreURL}`);

  if (config.startWithStudio) {
    console.log(` > Studio at ${studioURL}`);
    require('child_process').exec(`open ${studioURL}`);
  }
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit('connection', socket, request);
  });
});

module.exports = {};

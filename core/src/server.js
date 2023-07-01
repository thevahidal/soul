#!/usr/bin/env node

const http = require('http');

const app = require('./index');
const { wss } = require('./websocket');
const config = require('./config/index');

const server = http.createServer(app);

const port = config.port;
server.listen(port, () => {
  console.log(`Soul is running on port ${port}...`);

  if (config.startWithStudio) {
    // Importing this would do the job.
    const SoulStudio = require('soul-studio');
  }
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit('connection', socket, request);
  });
});

module.exports = {};

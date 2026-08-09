#!/usr/bin/env node

const http = require('http');

const app = require('./index');
const { wss } = require('./websocket');
const config = require('./config/index');
const db = require('./db/index');
const logger = require('./utils/logger');
const { removeRevokedRefreshTokens } = require('./controllers/auth');
const { authConstants } = require('./constants');

if (config.startWithStudio) {
  (async () => {
    const { handler: soulStudioHandler } = await import(
      'soul-studio/build/handler.js'
    );
    // Deliberately not `app.use('/studio', soulStudioHandler)`: Express
    // strips the mount prefix from `req.url` before invoking a path-mounted
    // middleware, but soul-studio's adapter-node build has `paths.base:
    // '/studio'` baked in at build time and resolves its own routes
    // against the *unstripped* URL -- so a stripped `/login` never matches
    // its `/studio/login` route and every request 404s. Mounting at the
    // root and filtering by path ourselves leaves `req.url` untouched.
    app.use((req, res, next) => {
      if (req.url === '/studio' || req.url.startsWith('/studio/')) {
        return soulStudioHandler(req, res, next);
      }
      next();
    });
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

// remove revoked refresh tokens every X days
const revokedTokensCleanupInterval = setInterval(
  removeRevokedRefreshTokens,
  authConstants.REVOKED_REFRESH_TOKENS_REMOVAL_TIME_RANGE,
);

let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info(`Received ${signal}, shutting down gracefully...`);

  // force-exit if cleanup hangs
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  clearInterval(revokedTokensCleanupInterval);

  wss.clients.forEach((client) => client.close());
  wss.close();

  server.close((err) => {
    if (err) {
      logger.error('Error while closing HTTP server', { error: err.message });
    }

    try {
      db.close();
    } catch (error) {
      logger.error('Error while closing database connection', {
        error: error.message,
      });
    }

    clearTimeout(forceExitTimer);
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled promise rejection', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('unhandledRejection');
});

module.exports = {};

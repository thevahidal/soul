const { WebSocketServer } = require('ws');
const cookie = require('cookie');

const db = require('./db/index');
const config = require('./config/index');
const { decodeToken } = require('./utils/index');
const logger = require('./utils/logger');
const { authService } = require('./services');

const wss = new WebSocketServer({ noServer: true });

const websocketSubscribers = new Map();

wss.on('connection', async function (ws, request) {
  const [_path, params] = (request.url || '').split('?');

  if (!_path.startsWith('/ws')) {
    ws.close();
    return;
  }

  const tableName = _path.replace('/ws/tables/', '').replace('/', '');

  // if table does not exists close the connection
  const query = `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`;
  try {
    const table = db.prepare(query).get(tableName);

    if (!table) {
      ws.send(
        JSON.stringify({
          message: `Table ${tableName} does not exist`,
        }),
      );

      ws.close();
      return;
    }
  } catch (error) {
    ws.send(
      JSON.stringify({
        message: error.message,
      }),
    );
    ws.close();
    return;
  }

  // realtime subscriptions carry the same read access requirements as the
  // REST API -- unauthenticated/unauthorized clients must not be able to
  // subscribe to row changes on a table they can't read via the REST API.
  if (config.auth) {
    const cookies = cookie.parse(request.headers.cookie || '');
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      ws.send(JSON.stringify({ message: 'Missing access token' }));
      ws.close();
      return;
    }

    let payload;
    try {
      payload = await decodeToken(accessToken, config.tokenSecret);
    } catch {
      ws.send(JSON.stringify({ message: 'Invalid access token' }));
      ws.close();
      return;
    }

    if (!authService.hasTablePermission({ payload, tableName, verb: 'GET' })) {
      ws.send(
        JSON.stringify({
          message: `Not authorized to subscribe to table "${tableName}"`,
        }),
      );
      ws.close();
      return;
    }
  }

  if (!websocketSubscribers.has(tableName)) {
    websocketSubscribers.set(tableName, new Set());
  }

  const subscriber = {
    ws,
    params: new URLSearchParams(params),
  };

  logger.info(`New subscriber for table ${tableName}`);
  websocketSubscribers.get(tableName).add(subscriber);

  ws.send(JSON.stringify({ message: `Subscribed to table "${tableName}"` }));

  ws.on('message', function (message) {
    logger.debug(`received: ${message}`);
  });

  ws.on('close', function () {
    websocketSubscribers.get(tableName).delete(subscriber);
  });
});

module.exports = {
  wss,
  websocketSubscribers,
};

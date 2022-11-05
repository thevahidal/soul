const { WebSocketServer } = require('ws');

const db = require('./db/index');

const wss = new WebSocketServer({ noServer: true });

const websocketSubscribers = new Map();

wss.on('connection', function (ws, request) {
  const [_path, params] = request?.url?.split('?');

  if (!_path.startsWith('/ws')) {
    ws.close();
    return;
  }

  const tableName = _path.replace('/ws/tables/', '').replace('/', '');

  // if table does not exists close the connection
  const query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`;
  try {
    const table = db.prepare(query).get();

    if (!table) {
      ws.send(
        JSON.stringify({
          message: `Table ${tableName} does not exist`,
        })
      );

      ws.close();
      return;
    }
  } catch (error) {
    ws.send(
      JSON.stringify({
        message: error.message,
      })
    );
    ws.close();
    return;
  }

  if (!websocketSubscribers.has(tableName)) {
    websocketSubscribers.set(tableName, new Set());
  }

  const subscriber = {
    ws,
    params: new URLSearchParams(params),
  };

  console.log(`New subscriber for table ${tableName}`);
  websocketSubscribers.get(tableName).add(subscriber);

  ws.send(JSON.stringify({ message: `Subscribed to table "${tableName}"` }));

  ws.on('message', function (message) {
    console.log('received: %s', message);
  });

  ws.on('close', function () {
    websocketSubscribers.get(tableName).delete(subscriber);
  });
});

module.exports = {
  wss,
  websocketSubscribers,
};

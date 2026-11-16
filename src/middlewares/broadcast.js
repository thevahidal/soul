const { websocketSubscribers } = require('../websocket');

const broadcastToTable = (tableName, data) => {
  websocketSubscribers?.get(tableName)?.forEach(({ ws }) => {
    ws.send(JSON.stringify(data));
  });
};

const broadcast = (req) => broadcastToTable(req.params.name, req.broadcast);

module.exports = {
  broadcast,
  broadcastToTable,
};

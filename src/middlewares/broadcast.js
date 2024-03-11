const { websocketSubscribers } = require('../websocket');

const broadcast = (req) => {
  const data = req.broadcast;
  const { name: tableName } = req.params;

  const subscribers = websocketSubscribers?.get(tableName);

  if (subscribers) {
    subscribers.forEach(({ ws }) => {
      ws.send(JSON.stringify(data));
    });
  }
};

module.exports = {
  broadcast,
};

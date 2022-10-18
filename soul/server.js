const app = require('./index');
const config = require('./config/index');

const port = config.port;
app.listen(port, () => {
  console.log(`Soul is running on port ${port}...`);
});

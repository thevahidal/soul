const express = require('express');
const bodyParser = require('body-parser');

const db = require('./db/index');
const rootRoutes = require('./routes/index');
const tablesRoutes = require('./routes/tables');
const rowsRoutes = require('./routes/rows');
const { logger } = require('./middlewares/logger');

const app = express();

app.use(bodyParser.json());

// Activate wal mode
db.pragma('journal_mode = WAL');

app.use(logger);

app.use('/', rootRoutes);
app.use('/tables', tablesRoutes);
app.use('/tables', rowsRoutes);

app.listen(8000, () => {
  console.log('Running on port 8000...');
});

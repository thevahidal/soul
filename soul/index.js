const express = require('express');
const bodyParser = require('body-parser');

const db = require('./db/index');
const rootRoutes = require('./routes/index');
const tablesRoutes = require('./routes/tables');
const rowsRoutes = require('./routes/rows');

const app = express();

app.use(bodyParser.json());

// Activate wal mode
db.pragma('journal_mode = WAL');

// Add a request logger
// including the method, url, status code and response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const delta = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${delta}ms`);
  });
  next();
});

app.use('/', rootRoutes);
app.use('/tables', tablesRoutes);
app.use('/tables', rowsRoutes);

app.listen(8000, () => {
  console.log('Running on port 8000...');
});

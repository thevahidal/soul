const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const expressWinston = require('express-winston');
const cors = require('cors');

const db = require('./db/index');
const rootRoutes = require('./routes/index');
const tablesRoutes = require('./routes/tables');
const rowsRoutes = require('./routes/rows');

const app = express();

app.use(bodyParser.json());

// Activate wal mode
db.pragma('journal_mode = WAL');

// Enable CORS
app.use(cors());

// Log requests
app.use(
  expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.json()
    ),
    meta: false,
    msg: 'HTTP {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: false,
  })
);

app.use('/', rootRoutes);
app.use('/tables', tablesRoutes);
app.use('/tables', rowsRoutes);

app.listen(8000, () => {
  console.log('Running on port 8000...');
});

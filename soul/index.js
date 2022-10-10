const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const expressWinston = require('express-winston');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config/index');
const db = require('./db/index');
const rootRoutes = require('./routes/index');
const tablesRoutes = require('./routes/tables');
const rowsRoutes = require('./routes/rows');

const app = express();

app.use(bodyParser.json());

// Activate wal mode
db.pragma('journal_mode = WAL');

// Enable CORS
const corsOptions = {
  origin: config.cors.origin,
};
app.use(cors(corsOptions));

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

if (config.rateLimit.enabled) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max, // Limit each IP to {max} requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Apply the rate limiting middleware to all requests
  app.use(limiter);
}

app.use('/', rootRoutes);
app.use('/tables', tablesRoutes);
app.use('/tables', rowsRoutes);

const { port } = config;
app.listen(port, () => {
  console.log(`Soul is running on port ${port}...`);
});

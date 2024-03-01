#! /usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const expressWinston = require('express-winston');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/index');
const db = require('./db/index');
const rootRoutes = require('./routes/index');
const tablesRoutes = require('./routes/tables');
const rowsRoutes = require('./routes/rows');
const swaggerFile = require('./swagger/swagger.json');
const { setupExtensions } = require('./extensions');
const { createDefaultTables } = require('./controllers/auth');
const { runCLICommands } = require('./commands');

const app = express();
app.get('/health', (req, res) => {
  res.send('OK');
});

app.use(bodyParser.json());

// Activate wal mode
db.exec('PRAGMA journal_mode = WAL');

// Enable CORS
let corsOrigin = config.cors.origin;

if (corsOrigin.includes('*')) {
  corsOrigin = '*';
}

const corsOptions = { origin: corsOrigin };

app.use(cors(corsOptions));

// Log requests
if (config.verbose !== null) {
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      format: winston.format.combine(
        winston.format.colorize(),

        winston.format.json(),
      ),
      meta: false,
      msg: 'HTTP {{req.method}} {{req.url}}',
      expressFormat: true,

      colorize: false,
    }),
  );
}

if (config.rateLimit.enabled) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max, // Limit each IP to {max} requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit*` headers
    legacyHeaders: false, // Disable the `XRateLimit*` headers
  });

  // Apply the rate limiting middleware to all requests
  app.use(limiter);
}

//If Auth mode is activated then create auth tables in the DB
if (config.auth) {
  createDefaultTables();
} else {
  console.warn(
    'Warning: Soul is running in open mode without authentication or authorization for API endpoints. Please be aware that your API endpoints will not be secure.',
  );
}

// If the user has passed custom CLI commands run the command and exit to avoid running the server
runCLICommands();

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/api', rootRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/tables', rowsRoutes);

setupExtensions(app, db);

module.exports = app;

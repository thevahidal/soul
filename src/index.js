#! /usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const expressWinston = require('express-winston');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const cookieParser = require('cookie-parser');

const config = require('./config/index');
const db = require('./db/index');

const rootRoutes = require('./routes/index');
const tablesRoutes = require('./routes/tables');
const rowsRoutes = require('./routes/rows');
const authRoutes = require('./routes/auth');

const swaggerFile = require('./swagger/swagger.json');
const { setupExtensions } = require('./extensions');
const { createDefaultTables, updateUser } = require('./controllers/auth');
const { yargs } = require('./cli');

const app = express();
const { argv } = yargs;

app.get('/health', (req, res) => {
  res.send('OK');
});

app.use(bodyParser.json());
app.use(cookieParser());

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

//If the updateuser command is passed from the CLI execute the updateuser function
if (argv._.includes('updateuser')) {
  const { id, password, is_superuser } = argv;

  if (!password && !is_superuser) {
    console.log(
      'Please provide either the --password or --is_superuser flag when using the updateuser command.',
    );
    process.exit(1);
  } else {
    updateUser({ id, password, is_superuser });
  }
}

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/api', rootRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/tables', rowsRoutes);

app.use('/api/auth', authRoutes);

setupExtensions(app, db);

module.exports = app;

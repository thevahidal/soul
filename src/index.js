#! /usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const expressWinston = require('express-winston');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const cookieParser = require('cookie-parser');

const config = require('./config/index');
const db = require('./db/index');
const logger = require('./utils/logger');

const rootRoutes = require('./routes/index');
const tablesRoutes = require('./routes/tables');
const rowsRoutes = require('./routes/rows');
const authRoutes = require('./routes/auth');

const swaggerFile = require('./swagger/swagger.json');
const { setupExtensions } = require('./extensions');
const {
  createDefaultTables,
  createInitialUser,
  checkAuthConfigs,
} = require('./controllers/auth');

const { runCLICommands } = require('./commands');

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(helmet());

// Activate wal mode
db.exec('PRAGMA journal_mode = WAL');

// Enable CORS
let corsOrigin = config.cors.origin;
const isWildcardOrigin = corsOrigin.includes('*');

if (isWildcardOrigin) {
  corsOrigin = '*';
  logger.warn(
    "CORS_ORIGIN_WHITELIST includes '*' -- credentialed requests (cookies) will be rejected by browsers for a wildcard origin, so credentials are disabled. Set an explicit origin list to allow cookie-based auth cross-origin.",
  );
}

const corsOptions = {
  origin: corsOrigin,
  credentials: !isWildcardOrigin,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// CSRF protection: validate Origin header for browser-initiated state-changing requests
app.use((req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  const origin = req.headers.origin;
  if (!origin) {
    return next(); // Non-browser client (curl, server-to-server) — no CSRF risk
  }
  const allowed = [].concat(config.cors.origin);
  if (allowed.includes('*') || allowed.some((o) => origin === o || origin.startsWith(o))) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: CSRF origin mismatch' });
});

// Log requests
if (config.verbose !== null) {
  app.use(
    expressWinston.logger({
      winstonInstance: logger,
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

// If Auth mode is activated but if the tokenSecret value is undefined then throw an error
checkAuthConfigs({ auth: config.auth, tokenSecret: config.tokenSecret });

// If Auth mode is activated then create auth tables in the DB & create a super user if there are no users in the DB
if (config.auth) {
  createDefaultTables();
  createInitialUser();
} else {
  logger.warn(
    'Soul is running in open mode without authentication or authorization for API endpoints. Please be aware that your API endpoints will not be secure.',
  );
}

// If the user has passed custom CLI commands run the command and exit to avoid running the server
runCLICommands();

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/api', rootRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/tables', rowsRoutes);

app.use('/api/auth', authRoutes);

setupExtensions(app, db);

// Final error-handling middleware: catches errors passed via next(err) or
// thrown/rejected in async route handlers (Express 5 forwards these
// automatically). Logs full detail server-side and returns a sanitized
// message -- never the raw error/stack -- to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });

  if (res.headersSent) {
    return;
  }

  res.status(err.status || 500).json({
    message: err.status ? err.message : 'Internal server error',
  });
});

module.exports = app;

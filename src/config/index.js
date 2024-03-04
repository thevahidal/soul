const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

const { yargs } = require('../cli');

const { argv } = yargs;

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    CORE_PORT: Joi.number().positive().default(8000),

    NODE_ENV: Joi.string()
      .valid('production', 'development', 'test')
      .default('production'),

    DB: Joi.string().required(),
    VERBOSE: Joi.string().valid('console', null).default(null),

    CORS_ORIGIN_WHITELIST: Joi.string().default('*'),
    AUTH: Joi.boolean().default(false),

    RATE_LIMIT_ENABLED: Joi.boolean().default(false),
    RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(1000),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(10),

    EXTENSIONS: Joi.string().default(null),

    START_WITH_STUDIO: Joi.boolean().default(false),

    ACCESS_TOKEN_SECRET: Joi.string().default(null),
    ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().default('5H'),
    REFRESH_TOKEN_SECRET: Joi.string().default(null),
    REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().default('3D'),
  })
  .unknown();

const env = {
  ...process.env,
};

if (argv.port) {
  env.CORE_PORT = argv.port;
}

if (argv.verbose) {
  env.VERBOSE = argv.verbose;
}

if (argv.database) {
  env.DB = argv.database;
}

if (argv.cors) {
  env.CORS_ORIGIN_WHITELIST = argv.cors;
}

if (argv.auth) {
  env.AUTH = argv.auth;
}

if (argv['rate-limit-enabled']) {
  env.RATE_LIMIT_ENABLED = argv['rate-limit-enabled'];
}

if (argv.accesstokensecret) {
  env.ACCESS_TOKEN_SECRET = argv.accesstokensecret;
}

if (argv.accesstokenexpirationtime) {
  env.ACCESS_TOKEN_EXPIRATION_TIME = argv.accesstokenexpirationtime;
}

if (argv.refreshtokensecret) {
  env.REFRESH_TOKEN_SECRET = argv.refreshtokensecret;
}

if (argv.refreshtokenexpirationtime) {
  env.REFRESH_TOKEN_EXPIRATION_TIME = argv.refreshtokenexpirationtime;
}

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,

  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',

  port: argv.port || envVars.CORE_PORT,
  verbose: argv['verbose'] || envVars.VERBOSE,

  db: {
    filename: argv.database || envVars.DB || ':memory:',
  },
  cors: {
    origin: argv.cors?.split(',') ||
      envVars.CORS_ORIGIN_WHITELIST?.split(',') || ['*'],
  },

  auth: argv.auth || envVars.AUTH,
  accessTokenSecret: argv.accesstokensecret || envVars.ACCESS_TOKEN_SECRET,
  accessTokenExpirationTime:
    argv.accesstokenexpirationtime || envVars.ACCESS_TOKEN_EXPIRATION_TIME,
  refreshTokenSecret: argv.refreshtokensecret || envVars.REFRESH_TOKEN_SECRET,
  refreshTokenExpirationTime:
    argv.refreshtokenexpirationtime || envVars.REFRESH_TOKEN_EXPIRATION_TIME,

  rateLimit: {
    enabled: argv['rate-limit-enabled'] || envVars.RATE_LIMIT_ENABLED,
    windowMs: envVars.RATE_LIMIT_WINDOW,
    max: envVars.RATE_LIMIT_MAX,
  },

  extensions: {
    path: argv.extensions || envVars.EXTENSIONS,
  },

  startWithStudio: argv.studio || envVars.START_WITH_STUDIO,
};

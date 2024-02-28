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

    JWT_SECRET: Joi.string().default(null),
    JWT_EXPIRATION_TIME: Joi.string().default('1D'),

    INITIAL_SUPERUSER_USERNAME: Joi.string(),
    INITIAL_SUPERUSER_PASSWORD: Joi.string(),
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

if (argv.jwtsecret) {
  env.JWT_SECRET = argv.jwtsecret;
}

if (argv.jwtexpirationtime) {
  env.JWT_EXPIRATION_TIME = argv.jwtexpirationtime;
}

if (argv.initialSuperuserUsername) {
  env.INITIAL_SUPERUSER_USERNAME = argv.initialsuperuserssername;
}

if (argv.initialSuperuserPassword) {
  env.INITIAL_SUPERUSER_PASSWORD = argv.initialsuperuserpassword;
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
  jwtSecret: argv.jwtsecret || envVars.JWT_SECRET,
  jwtExpirationTime: argv.jwtexpirationtime || envVars.JWT_EXPIRATION_TIME,

  initialSuperuserUsername:
    argv.initialsuperuserusername || envVars.INITIAL_SUPERUSER_USERNAME,
  initialSuperuserPassword:
    argv.initialsuperuserpassword || envVars.INITIAL_SUPERUSER_PASSWORD,

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

const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

const { yargs, usage, options } = require('../cli');

const { argv } = yargs;

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    PORT: Joi.number().positive().default(8000),

    NODE_ENV: Joi.string()
      .valid('production', 'development', 'test')
      .default('production'),

    DB: Joi.string().required(),
    VERBOSE: Joi.string().valid('console', null).default(null),

    CORS_ORIGIN_WHITELIST: Joi.string().default('*'),

    RATE_LIMIT_ENABLED: Joi.boolean().default(false),
    RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(1000),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(10),
  })
  .unknown();

const env = {
  ...process.env,
};

if (argv.port) {
  env.PORT = argv.port;
}

if (argv.verbose) {
  env.VERBOSE = argv.verbose;
}

if (argv.database) {
  env.DB = argv.database;
}

if (argv['rate-limit-enabled']) {
  env.RATE_LIMIT_ENABLED = argv['rate-limit-enabled'];
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

  port: argv.port || envVars.PORT,
  verbose: argv['verbose'] || envVars.VERBOSE,

  db: {
    filename: argv.database || envVars.DB || ':memory:',
  },
  cors: {
    origin: envVars.CORS_ORIGIN_WHITELIST.split(','),
  },
  rateLimit: {
    enabled: argv['rate-limit-enabled'] || envVars.RATE_LIMIT_ENABLED,
    windowMs: envVars.RATE_LIMIT_WINDOW,
    max: envVars.RATE_LIMIT_MAX,
  },
};

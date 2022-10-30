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
      .required(),

    DB: Joi.string().required(),
    VERBOSE: Joi.string().valid('console', null).default(null),

    CORS_ORIGIN_WHITELIST: Joi.string().required(),

    RATE_LIMIT_ENABLED: Joi.boolean().default(false),
    RATE_LIMIT_WINDOW_MS: Joi.number().positive().required(),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().required(),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate({
    ...process.env,

    // Allow overriding of config with CLI args
    PORT: argv.port,
    VERBOSE: argv['verbose'],
    DB: argv.database,
    RATE_LIMIT_ENABLED: argv['rate-limit-enabled'],
  });

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

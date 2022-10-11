const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

const { yargs, usage, options } = require('../cli');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    PORT: Joi.number().positive().required(),

    NODE_ENV: Joi.string()
      .valid('production', 'development', 'test')
      .required(),

    DB: Joi.string().required(),

    CORS_ORIGIN_WHITELIST: Joi.string().required(),

    RATE_LIMIT_ENABLED: Joi.boolean().required(),
    RATE_LIMIT_WINDOW_MS: Joi.number().positive().required(),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().required(),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const { argv } = yargs;

module.exports = {
  env: envVars.NODE_ENV,

  production: envVars.NODE_ENV === 'production',
  development: envVars.NODE_ENV === 'development',
  test: envVars.NODE_ENV === 'test',

  port: argv.port || envVars.PORT,

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

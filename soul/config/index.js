const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    PORT: Joi.number().positive().required(),

    NODE_ENV: Joi.string()
      .valid('production', 'development', 'test')
      .required(),

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

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  cors: {
    origin: envVars.CORS_ORIGIN_WHITELIST.split(','),
  },
  rateLimit: {
    enabled: envVars.RATE_LIMIT_ENABLED,
    windowMs: envVars.RATE_LIMIT_WINDOW,
    max: envVars.RATE_LIMIT_MAX,
  },
};

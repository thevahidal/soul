const Joi = require('joi');

const MAX_OPERATIONS = 100;

const batch = Joi.object({
  query: Joi.object().required(),
  params: Joi.object().required(),
  body: Joi.object({
    operations: Joi.array()
      .items(
        Joi.object({
          method: Joi.string().valid('POST', 'PUT', 'DELETE').required(),
          path: Joi.string().required(),
          body: Joi.object(),
        }),
      )
      .min(1)
      .max(MAX_OPERATIONS)
      .required(),
  }).required(),
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }).unknown(true),
});

module.exports = { batch };

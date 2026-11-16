const Joi = require('joi');

const transaction = Joi.object({
  query: Joi.object().required(),
  params: Joi.object().required(),
  body: Joi.object({
    transaction: Joi.array()
      .items(
        Joi.object({
          statement: Joi.string().required(),
          values: Joi.object().required(),
        }),
        Joi.object({
          query: Joi.string().required(),
        }),
      )
      .required(),
  }).required(),

  // .unknown(true): see the comment in schemas/tables.js -- rejects
  // unrelated cookies the browser sends otherwise.
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }).unknown(true),
});

module.exports = {
  transaction,
};

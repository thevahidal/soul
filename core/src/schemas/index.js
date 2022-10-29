const Joi = require('joi');

const transaction = Joi.object({
  transaction: Joi.array()
    .items(
      Joi.object({
        statement: Joi.string().required(),
        values: Joi.object().required(),
      }),
      Joi.object({
        query: Joi.string().required(),
      })
    )
    .required(),
});

module.exports = {
  transaction,
};

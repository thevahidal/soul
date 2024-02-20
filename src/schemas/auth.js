const Joi = require('joi');

const obtainAccessToken = Joi.object({
  query: Joi.object().required(),
  params: Joi.object({}).required(),

  body: Joi.object({
    fields: Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).required(),
  }).required(),
});

module.exports = {
  obtainAccessToken,
};

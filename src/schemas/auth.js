const Joi = require('joi');

const registerUser = Joi.object({
  query: Joi.object().required(),
  params: Joi.object().required(),
  body: Joi.object({
    fields: Joi.object({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      user_name: Joi.string().required(),
      password: Joi.string().min(8).required()
    }).required()
  }).required()
});

module.exports = {
  registerUser
};

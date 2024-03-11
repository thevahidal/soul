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

const refreshAccessToken = Joi.object({
  query: Joi.object().required(),
  params: Joi.object({}).required(),
  body: Joi.object({}).required(),
});

const changePassword = Joi.object({
  query: Joi.object().required(),
  params: Joi.object().required(),

  body: Joi.object({
    fields: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().required(),
    }).required(),
  }).required(),
});

module.exports = {
  obtainAccessToken,
  refreshAccessToken,
  changePassword,
};

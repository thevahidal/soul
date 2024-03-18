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

  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }),
});

const refreshAccessToken = Joi.object({
  query: Joi.object().required(),
  params: Joi.object({}).required(),
  body: Joi.object({}).required(),
  cookies: Joi.object({
    refreshToken: Joi.string().required(),
    accessToken: Joi.string().optional(),
  }).required(),
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
  cookies: Joi.object({
    accessToken: Joi.string().required(),
    refreshToken: Joi.string().optional(),
  }).required(),
});

const registerUser = Joi.object({
  query: Joi.object().required(),
  params: Joi.object({}).required(),
  body: Joi.object({
    fields: Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).required(),
  }).required(),

  cookies: Joi.object({
    accessToken: Joi.string().required(),
    refreshToken: Joi.string().optional(),
  }).required(),
});

module.exports = {
  obtainAccessToken,
  refreshAccessToken,
  changePassword,
  registerUser,
};

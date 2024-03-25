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

const updateRolePermissions = Joi.object({
  query: Joi.object({}).required(),
  params: Joi.object({ name: Joi.string(), pks: Joi.string() }).required(),
  body: Joi.object({
    fields: Joi.object({
      role_id: Joi.number().required(),
      table_name: Joi.string().required(),
      create: Joi.number().valid(0, 1).required(),
      read: Joi.number().valid(0, 1).required(),
      update: Joi.number().valid(0, 1).required(),
      delete: Joi.number().valid(0, 1).required(),
    }).required(),
  }).required(),

  cookies: Joi.object({
    accessToken: Joi.string().required(),
    refreshToken: Joi.string().optional(),
  }).required(),
});

const removeAccessTokens = Joi.object({
  query: Joi.object().required(),
  params: Joi.object({}).required(),
  body: Joi.object({}).required(),
  cookies: Joi.object({
    refreshToken: Joi.string().required(),
    accessToken: Joi.string().required(),
  }).required(),
});

module.exports = {
  obtainAccessToken,
  refreshAccessToken,
  changePassword,
  registerUser,
  updateRolePermissions,
  removeAccessTokens,
};

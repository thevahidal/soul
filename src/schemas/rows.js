const Joi = require('joi');

const listTableRows = Joi.object({
  query: Joi.object({
    _page: Joi.number().integer().min(1).default(1),
    _limit: Joi.number().integer().min(1).default(10),
    _search: Joi.string(),
    _ordering: Joi.string().regex(/^[\w-]+$/),
    _schema: Joi.string(),
    _extend: Joi.string(),
    _filters: Joi.string(),
  }).required(),
  params: Joi.object({
    name: Joi.string(),
  }).required(),
  body: Joi.object().required(),
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }),
});

const insertRowInTable = Joi.object({
  query: Joi.object().required(),
  params: Joi.object({
    name: Joi.string()
      .regex(/^[\w-]+$/)
      .min(3)
      .max(30)
      .required(),
  }).required(),
  body: Joi.object({
    fields: Joi.object().required(),
  }).required(),
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }),
});

const getRowInTableByPK = Joi.object({
  query: Joi.object({
    _lookup_field: Joi.string()
      .regex(/^[\w-]+$/)
      .min(3)
      .max(30),
    _schema: Joi.string(),
    _extend: Joi.string(),
  }).required(),
  params: Joi.object({
    name: Joi.string()
      .regex(/^[\w-]+$/)
      .min(3)
      .max(30)
      .required(),
    pks: Joi.string().required(),
  }).required(),
  body: Joi.object().required(),
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }),
});

const updateRowInTableByPK = Joi.object({
  query: Joi.object({
    _lookup_field: Joi.string()
      .regex(/^[\w-]+$/)
      .min(3)
      .max(30),
  }).required(),
  params: Joi.object({
    name: Joi.string()
      .regex(/^[\w-]+$/)
      .min(3)
      .max(30)
      .required(),
    pks: Joi.string().required(),
  }).required(),
  body: Joi.object({
    fields: Joi.object().required(),
  }).required(),
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }),
});

const deleteRowInTableByPK = Joi.object({
  query: Joi.object({
    _lookup_field: Joi.string()
      .regex(/^[\w-]+$/)
      .min(3)
      .max(30),
  }).required(),
  params: Joi.object({
    name: Joi.string()
      .regex(/^[\w-]+$/)
      .min(3)
      .max(30)
      .required(),
    pks: Joi.string().required(),
  }).required(),
  body: Joi.object().required(),
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }),
});

module.exports = {
  listTableRows,
  insertRowInTable,
  getRowInTableByPK,
  updateRowInTableByPK,
  deleteRowInTableByPK,
};

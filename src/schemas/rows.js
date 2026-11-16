const Joi = require('joi');

const listTableRows = Joi.object({
  query: Joi.object({
    _page: Joi.number().integer().min(1).default(1),
    _limit: Joi.number().integer().min(1).default(10),
    _search: Joi.string(),
    _ordering: Joi.string().regex(/^[\w.-]+$/),
    _schema: Joi.string(),
    _extend: Joi.string(),
    _filters: Joi.string(),
  }).required(),
  params: Joi.object({
    name: Joi.string(),
  }).required(),
  body: Joi.object().required(),
  // .unknown(true): see the comment in schemas/tables.js -- rejects
  // unrelated cookies the browser sends otherwise.
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }).unknown(true),
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
  // .unknown(true): see the comment in schemas/tables.js -- rejects
  // unrelated cookies the browser sends otherwise.
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }).unknown(true),
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
  // .unknown(true): see the comment in schemas/tables.js -- rejects
  // unrelated cookies the browser sends otherwise.
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }).unknown(true),
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
  // .unknown(true): see the comment in schemas/tables.js -- rejects
  // unrelated cookies the browser sends otherwise.
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }).unknown(true),
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
  // .unknown(true): see the comment in schemas/tables.js -- rejects
  // unrelated cookies the browser sends otherwise.
  cookies: Joi.object({
    refreshToken: Joi.string().optional(),
    accessToken: Joi.string().optional(),
  }).unknown(true),
});

module.exports = {
  listTableRows,
  insertRowInTable,
  getRowInTableByPK,
  updateRowInTableByPK,
  deleteRowInTableByPK,
};

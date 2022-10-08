const Joi = require('joi');

const listTableRows = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
});

const insertRowInTable = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  fields: Joi.object().required(),
});

const getRowInTableByPK = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  pk: Joi.string().required(),
  _field: Joi.string().min(3).max(30),
});

const updateRowInTableByPK = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  pk: Joi.string().required(),
  fields: Joi.object().required(),
  _field: Joi.string().min(3).max(30),
});

const deleteRowInTableByPK = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  pk: Joi.string().required(),
  _field: Joi.string().min(3).max(30),
});

module.exports = {
  listTableRows,
  insertRowInTable,
  getRowInTableByPK,
  updateRowInTableByPK,
  deleteRowInTableByPK,
};

const Joi = require('joi');

const listTables = Joi.object({
  _search: Joi.string(),
  _ordering: Joi.string(),
}).unknown(true);

const createTable = Joi.object({
  name: Joi.string().min(2).max(30).required(),
  autoAddCreatedAt: Joi.boolean().default(true),
  autoAddUpdatedAt: Joi.boolean().default(true),
  schema: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().min(2).max(30).required(),
        // type one of sqlite3 types
        type: Joi.string()
          .valid(
            'TEXT',
            'NUMERIC',
            'INTEGER',
            'REAL',
            'BLOB',
            'BOOLEAN',
            'DATE',
            'DATETIME'
          )
          .insensitive()
          .required(),
        default: Joi.any(),
        notNull: Joi.boolean(),
        unique: Joi.boolean(),
        primaryKey: Joi.boolean(),
        foreignKey: Joi.object({
          table: Joi.string().min(2).max(30).required(),
          column: Joi.string().min(2).max(30).required(),
          onDelete: Joi.string()
            .valid('CASCADE', 'SET NULL', 'SET DEFAULT', 'RESTRICT')
            .insensitive()
            .default('CASCADE'),
          onUpdate: Joi.string()
            .valid('CASCADE', 'SET NULL', 'SET DEFAULT', 'RESTRICT')
            .insensitive()
            .default('RESTRICT'),
        }),
        index: Joi.boolean(),
      })
    )
    .required(),
});

const deleteTable = Joi.object({
  name: Joi.string().min(3).max(30).required(),
});

module.exports = {
  listTables,
  createTable,
  deleteTable,
};
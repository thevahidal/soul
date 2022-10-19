const swaggerAutogen = require('swagger-autogen')();

const config = require('../config/index');
const version = require('../../package.json').version;

const outputFile = './swagger.json';
const endpointsFiles = ['../index.js'];

const doc = {
  info: {
    version: version,
    title: 'Soul API',
    description:
      'API Documentation for <b>Soul</b>, a simple SQLite RESTful server. ',
  },
  host: `localhost:${config.port}`,
  basePath: '/',
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'Root',
      description: 'Root endpoints',
    },
    {
      name: 'Tables',
      description: 'Tables endpoints',
    },
    {
      name: 'Rows',
      description: 'Rows endpoints',
    },
  ],
  securityDefinitions: {},
  definitions: {
    Table: {
      name: 'users',
    },
    Row: {},
    Query: {
      query: 'SELECT * FROM users',
    },
    Statement: {
      statement:
        'INSERT INTO users (id, firstName, lastName) VALUES (:id, :firstName, :lastName)',
      values: { id: 1, firstName: 'John', lastName: 'Doe' },
    },
    Transaction: {
      transaction: [
        { $ref: '#/definitions/Query' },
        { $ref: '#/definitions/Statement' },
      ],
    },
    ForeignKey: {
      table: 'users',
      column: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    Field: {
      name: 'user_id',
      type: 'INTEGER',
      default: 1,
      notNull: true,
      unique: false,
      primaryKey: false,
      foreignKey: { $ref: '#/definitions/ForeignKey' },
      index: false,
    },
    Schema: [{ $ref: '#/definitions/Field' }],

    CreateTableRequestBody: {
      name: 'users',
      schema: { $ref: '#/definitions/Schema' },
      autoAddCreatedAt: true,
      autoAddUpdatedAt: true,
    },
    CreateTableSuccessResponse: {
      message: 'Table created',
      data: {
        name: 'users',
        fields: [{ $ref: '#/definitions/Field' }],
      },
    },
    CreateTableErrorResponse: {
      message: 'Table not created',
      error: 'already_exists',
      data: {},
    },

    InsertRowRequestBody: {
      $ref: '#/definitions/Row',
    },
    InsertRowSuccessResponse: {
      message: 'Row inserted',
      data: {
        id: 1,
        createdAt: '2022-10-10 10:55:29',
        updatedAt: '2022-10-10 10:55:29',
        firstName: 'John',
      },
    },
    InsertRowErrorResponse: {
      message: 'Row not inserted',
      error: 'not_found',
    },

    UpdateRowRequestBody: {
      fields: [{ $ref: '#/definitions/Field' }],
    },

    TransactionRequestBody: {
      $ref: '#/definitions/Transaction',
    },
  },
};

swaggerAutogen(outputFile, endpointsFiles, doc);

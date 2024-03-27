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
      'API Documentation for <b>Soul</b>, a SQLite REST and realtime server. ',
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
    {
      name: 'Auth',
      description: 'Auth endpoints',
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

    BulkUpdateRowsRequestBody: {
      pks: [1, 2, 3],
      fields: [{ $ref: '#/definitions/Field' }],
    },

    BulkDeleteRowsRequestBody: {
      pks: [1, 2, 3],
    },

    TransactionRequestBody: {
      $ref: '#/definitions/Transaction',
    },
    ObtainAccessTokenRequestBody: {
      fields: {
        username: '@john',
        password: 'Ak22#cPM33@v*#',
      },
    },

    ObtainAccessTokenSuccessResponse: {
      message: 'Success',
      data: {
        userId: 1,
      },
    },

    InvalidCredentialErrorResponse: {
      message: 'Invalid username or password',
    },

    UserRegisterationRequestBody: {
      fields: {
        username: '@john',
        password: 'Ak22#cPM33@v*#',
      },
    },

    WeakPasswordErrorResponse: {
      message: 'This password is weak, please use another password',
    },

    UsernameTakenErrorResponse: {
      message: 'This username is taken',
    },

    DefaultRoleNotCreatedErrorResponse: {
      message: 'Please restart soul so a default role can be created',
    },

    UserNotFoundErrorResponse: {
      message: 'User not found',
    },

    InvalidRefreshTokenErrorResponse: {
      message: 'Invalid refresh token',
    },

    ChangePasswordRequestBody: {
      fields: {
        currentPassword: 'Ak22#cPM33@v*#',
        newPassword: 'hKB33o@3245CD$',
      },
    },

    ChangePasswordSuccessResponse: {
      message: 'Password updated successfully',
      data: { id: 1, username: '@john' },
    },

    RefreshAccessTokenSuccessResponse: {
      message: 'Success',
      data: { userId: 1 },
    },

    InvalidPasswordErrorResponse: { message: 'Invalid password' },

    RemoveTokensResponse: {
      message: 'Logout successful',
    },
  },
};

swaggerAutogen(outputFile, endpointsFiles, doc);

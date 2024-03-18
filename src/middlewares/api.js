const config = require('../config');
const { registerUser } = require('../controllers/auth');
const {
  apiConstants,
  dbConstants,
  responseMessages,
} = require('../constants/');
const { removeFields } = require('../utils');

const { httpVerbs } = apiConstants;
const { reservedTableNames, USERS_TABLE, tableFields } = dbConstants;
const { errorMessage } = responseMessages;

const processRowRequest = async (req, res, next) => {
  const resource = req.params.name;
  const { method } = req;

  // If the user sends a request to the auth tables while AUTH is set to false, throw an error
  if (apiConstants.authEndpoints.includes(resource) && !config.auth) {
    return res.status(403).send({
      message: errorMessage.AUTH_SET_TO_FALSE_ERROR,
    });
  }

  // Redirect this request to the registerUser controller => POST /api/tables/_users/rows
  if (resource === USERS_TABLE && method === httpVerbs.POST) {
    return registerUser(req, res);
  }

  // Remove some fields for this request and check the username field => PUT /api/tables/_users/rows
  if (resource === USERS_TABLE && method === httpVerbs.PUT) {
    /**
     * remove some user fields from the request like (is_superuser, hashed_password, salt).
     * NOTE: password can be updated via the /change-password API and superuser status can be only updated from the CLI
     */
    removeFields(
      [req.body.fields],
      [tableFields.SALT, tableFields.IS_SUPERUSER, tableFields.HASHED_PASSWORD],
    );
  }

  next();
};

const processRowResponse = async (req, res, next) => {
  // Extract payload data
  const resource = req.params.name;
  const status = req.response.status;
  const payload = req.response.payload;

  // Remove some fields from the response
  if (resource === USERS_TABLE) {
    removeFields(payload.data, [tableFields.SALT, tableFields.HASHED_PASSWORD]);
  }

  res.status(status).send(payload);
  next();
};

const processTableRequest = async (req, res, next) => {
  const { method, body, baseUrl } = req;

  // if the user tries to create a table with the reserved table names throw an error. Request => POST /api/tables
  if (baseUrl === apiConstants.baseTableUrl && method === httpVerbs.POST) {
    if (reservedTableNames.includes(body.name)) {
      return res.status(409).send({
        message: errorMessage.RESERVED_TABLE_NAME_ERROR,
      });
    }
  }

  next();
};

module.exports = {
  processRowRequest,
  processRowResponse,
  processTableRequest,
};

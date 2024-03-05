const config = require('../config');
const { registerUser, isUsernameTaken } = require('../controllers/auth');
const { apiConstants, dbConstants } = require('../constants/');
const { removeFields } = require('../utils');

const { SALT, HASHED_PASSWORD, IS_SUPERUSER } = apiConstants.fields._users;
const { reservedTableNames } = dbConstants;

const processRowRequest = async (req, res, next) => {
  const resource = req.params.name;
  const { method, body } = req;
  const fields = body.fields;

  // If the user sends a request when auth is set to false, throw an error
  if (apiConstants.defaultRoutes.includes(resource) && !config.auth) {
    return res.status(401).send({
      message: 'You can not access this endpoint while AUTH is set to false',
    });
  }

  // Redirect this request to the registerUser controller => POST /api/tables/_users/rows
  if (resource === '_users' && method === 'POST') {
    return registerUser(req, res);
  }

  // Remove some fields for this request and check the username field => PUT /api/tables/_users/rows
  if (resource === '_users' && method === 'PUT') {
    // check if the username is taken
    if (fields.username) {
      if (isUsernameTaken(fields.username)) {
        return res
          .status(409)
          .send({ message: 'This username is already taken' });
      }
    }

    // remove some user fields from the request like (is_superuser, hashed_password, salt). NOTE: password can be updated via the /change-password API and superuser status can be only updated from the CLI
    removeFields([req.body.fields], [SALT, IS_SUPERUSER, HASHED_PASSWORD]);
  }

  next();
};

const processRowResponse = async (req, res, next) => {
  // Extract payload data
  const resource = req.params.name;
  const status = req.response.status;
  const payload = req.response.payload;

  // Remove some fields from the response
  if (resource === '_users') {
    removeFields(payload.data, [SALT, HASHED_PASSWORD]);
  }

  res.status(status).send(payload);
  next();
};

const processTableRequest = async (req, res, next) => {
  const { method, body, baseUrl } = req;

  // if the user tries to create a table with the reserved table names throw an error. Request => POST /api/tables
  if (baseUrl === apiConstants.baseTableUrl && method === 'POST') {
    if (reservedTableNames.includes(body.name)) {
      return res.status(409).send({
        message: `The table name is reserved. Please choose a different name for the table. Table name: ${body.name}.`,
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

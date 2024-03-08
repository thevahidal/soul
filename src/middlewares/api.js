const config = require('../config');
const { registerUser } = require('../controllers/auth');
const { apiConstants } = require('../constants/');

const processRequest = async (req, res, next) => {
  const resource = req.params.name;
  const method = req.method;

  // If the user sends a request when auth is set to false, throw an error
  if (apiConstants.defaultRoutes.includes(resource) && !config.auth) {
    return res.status(403).send({
      message: 'You can not access this endpoint while AUTH is set to false',
    });
  }

  // Execute user registration function
  if (resource === '_users' && method === 'POST' && config.auth) {
    return registerUser(req, res);
  }

  next();
};

const processResponse = async (req, res, next) => {
  // Extract payload data
  const resource = req.params.name;
  const status = req.response.status;
  const payload = req.response.payload;

  // Remove some fields from the response
  if (resource === '_users') {
    removeFields(payload.data, ['salt', 'hashed_password']);
  }

  res.status(status).send(payload);
  next();
};

const removeFields = async (rows, fields) => {
  const newPayload = rows.map((row) => {
    fields.map((field) => {
      delete row[field];
    });
  });

  return newPayload;
};

module.exports = {
  processRequest,
  processResponse,
};

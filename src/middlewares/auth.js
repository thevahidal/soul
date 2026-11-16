const config = require('../config');
const { decodeToken } = require('../utils/index');
const logger = require('../utils/logger');
const { apiConstants, responseMessages } = require('../constants');
const { authService } = require('../services');

const { errorMessage } = responseMessages;

const authenticate = async (req, res, next) => {
  if (!config.auth) {
    return next();
  }

  const accessToken = req.cookies.accessToken;

  // no token: anonymous request, only allowed when an anon role is configured
  if (!accessToken && !config.anonRole) {
    return res
      .status(401)
      .send({ message: errorMessage.INVALID_ACCESS_TOKEN_ERROR });
  }

  if (accessToken) {
    try {
      req.user = await decodeToken(accessToken, config.tokenSecret);
    } catch {
      // an invalid/expired access token is a routine client-side
      // condition, not an unexpected server error -- not logged as one.
      return res
        .status(401)
        .send({ message: errorMessage.INVALID_ACCESS_TOKEN_ERROR });
    }
  }

  next();
};

const hasAccess = (req, res, next) =>
  authenticate(req, res, () => {
    if (!config.auth) {
      return next();
    }

    try {
      // endpoints open to any authenticated user regardless of roles
      if (
        req.user &&
        apiConstants.universalAccessEndpoints.includes(req.originalUrl)
      ) {
        return next();
      }

      if (
        authService.hasTablePermission({
          payload: req.user || null,
          tableName: req.params.name,
          verb: req.method,
        })
      ) {
        return next();
      }

      return res
        .status(403)
        .send({ message: errorMessage.NOT_AUTHORIZED_ERROR });
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      res.status(401).send({ message: error.message });
    }
  });

module.exports = { authenticate, hasAccess };

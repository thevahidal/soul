const config = require('../config');
const { decodeToken } = require('../utils/index');
const logger = require('../utils/logger');
const { apiConstants, responseMessages } = require('../constants');
const { authService } = require('../services');

const { errorMessage } = responseMessages;

const hasAccess = async (req, res, next) => {
  let payload;
  const { name: tableName } = req.params;
  const verb = req.method;
  const originalURL = req.originalUrl;

  try {
    if (config.auth) {
      // extract the payload from the token and verify it
      try {
        payload = await decodeToken(
          req.cookies.accessToken,
          config.tokenSecret,
        );
        req.user = payload;
      } catch {
        // an invalid/expired access token is a routine client-side
        // condition, not an unexpected server error -- not logged as one.
        return res
          .status(401)
          .send({ message: errorMessage.INVALID_ACCESS_TOKEN_ERROR });
      }

      // if the endpoint is set to be accessed by any user regardless of there roles, then allow access
      if (apiConstants.universalAccessEndpoints.includes(originalURL)) {
        return next();
      }

      if (authService.hasTablePermission({ payload, tableName, verb })) {
        return next();
      }

      return res
        .status(403)
        .send({ message: errorMessage.NOT_AUTHORIZED_ERROR });
    } else {
      next();
    }
  } catch (error) {
    logger.error(error.message, { stack: error.stack });
    res.status(401).send({ message: error.message });
  }
};

module.exports = { hasAccess };

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
      const accessToken = req.cookies.accessToken;

      // no token: anonymous request, only allowed when an anon role is configured
      if (!accessToken && !config.anonRole) {
        return res
          .status(401)
          .send({ message: errorMessage.INVALID_ACCESS_TOKEN_ERROR });
      }

      // extract the payload from the token and verify it
      if (accessToken) {
        try {
          payload = await decodeToken(accessToken, config.tokenSecret);
          req.user = payload;
        } catch {
          // an invalid/expired access token is a routine client-side
          // condition, not an unexpected server error -- not logged as one.
          return res
            .status(401)
            .send({ message: errorMessage.INVALID_ACCESS_TOKEN_ERROR });
        }
      }

      // if the endpoint is set to be accessed by any user regardless of there roles, then allow access
      if (
        payload &&
        apiConstants.universalAccessEndpoints.includes(originalURL)
      ) {
        return next();
      }

      if (
        authService.hasTablePermission({
          payload: payload || null,
          tableName,
          verb,
        })
      ) {
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

const config = require('../config');
const { decodeToken, toBoolean } = require('../utils/index');
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
      } catch (error) {
        return res
          .status(401)
          .send({ message: errorMessage.INVALID_ACCESS_TOKEN_ERROR });
      }

      // if the user is a super_user, allow access on the resource
      if (toBoolean(payload.isSuperuser)) {
        return next();
      }

      // if the endpoint is set to be accessed by any user regardless of there roles, then allow access
      if (apiConstants.universalAccessEndpoints.includes(originalURL)) {
        return next();
      }

      // if table_name is not passed from the router throw unauthorized error
      if (!tableName) {
        return res
          .status(403)
          .send({ message: errorMessage.NOT_AUTHORIZED_ERROR });
      }

      // if the user is not a super user, fetch the permission of the user from the DB
      const rolePermissions = authService.getPermissionByRoleIds({
        roleIds: payload.roleIds,
      });

      const resourcePermission = rolePermissions.filter(
        (row) => row.table_name === tableName,
      );

      if (resourcePermission.length <= 0) {
        return res
          .status(403)
          .send({ message: errorMessage.PERMISSION_NOT_DEFINED_ERROR });
      }

      // If the user has permission on the table in at least in one of the roles then allow access on the table
      let hasPermission = false;

      resourcePermission.some((resource) => {
        const httpMethod =
          apiConstants.httpMethodDefinitions[verb].toLowerCase();

        if (toBoolean(resource[httpMethod])) {
          hasPermission = true;
          return true;
        }
      });

      if (hasPermission) {
        next();
      } else {
        return res
          .status(403)
          .send({ message: errorMessage.NOT_AUTHORIZED_ERROR });
      }
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(401).send({ message: error.message });
  }
};

module.exports = { hasAccess };

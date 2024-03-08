const config = require('../config');
const { decodeToken, toBoolean } = require('../utils/index');
const httpVerbs = require('../constants/httpVerbs');

const isAuthenticated = async (req, res, next) => {
  let payload;
  const { name: tableName } = req.params;
  const verb = req.method;

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
        return res.status(403).send({ message: 'Invalid access token' });
      }

      // if the user is a super_user, allow access on the resource
      if (toBoolean(payload.isSuperuser)) {
        return next();
      }

      // if table_name is not passed from the router throw unauthorized error
      if (!tableName) {
        return res.status(403).send({ message: 'Not authorized' });
      }

      // if the user is not a super user, check the users permission on the resource
      const permissions = payload.permissions.filter((row) => {
        return row.table_name === tableName;
      });

      if (permissions.length <= 0) {
        return res
          .status(403)
          .send({ message: 'Permission not defined for this role' });
      }

      const permission = permissions[0];
      const httpMethod = httpVerbs[verb].toLowerCase();

      if (toBoolean(permission[httpMethod])) {
        next();
      } else {
        return res.status(403).send({ message: 'Not authorized' });
      }
    } else {
      next();
    }
  } catch (error) {
    res.status(401).send({ message: error.message });
  }
};

module.exports = { isAuthenticated };

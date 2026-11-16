const fs = require('fs');
const path = require('path');

const config = require('./config');
const { decodeToken, toBoolean } = require('./utils');
const logger = require('./utils/logger');
const { responseMessages } = require('./constants');
const { authService } = require('./services');

const { path: extensionsPath } = config.extensions;
const { errorMessage } = responseMessages;

// Wraps an extension handler with an auth check, reusing the same
// decodeToken/hasTablePermission primitives the core hasAccess middleware
// uses -- not hasAccess itself, since that assumes a `:name` route param
// for the table, which extension routes don't have.
//
// `auth` accepts:
//   true                 -- must be authenticated, no further check
//   { superuserOnly }    -- must be authenticated and a superuser
//   { table }            -- must be authenticated and have permission on
//                           `table` for the request's HTTP method (via
//                           authService.hasTablePermission, which already
//                           grants superusers everything)
const withAuth = (auth, handler, db) => async (req, res) => {
  if (!config.auth) {
    return handler(req, res, db);
  }

  let payload;
  try {
    payload = await decodeToken(req.cookies?.accessToken, config.tokenSecret);
    req.user = payload;
  } catch {
    return res
      .status(401)
      .send({ message: errorMessage.INVALID_ACCESS_TOKEN_ERROR });
  }

  if (auth === true) {
    return handler(req, res, db);
  }

  if (auth.superuserOnly && !toBoolean(payload.isSuperuser)) {
    return res.status(403).send({ message: errorMessage.NOT_AUTHORIZED_ERROR });
  }

  if (auth.table) {
    const hasPermission = authService.hasTablePermission({
      payload,
      tableName: auth.table,
      verb: req.method,
    });

    if (!hasPermission) {
      return res
        .status(403)
        .send({ message: errorMessage.NOT_AUTHORIZED_ERROR });
    }
  }

  return handler(req, res, db);
};

const loadExtensionRoutes = (dirPath) => {
  const files = fs.readdirSync(dirPath).filter((file) => file.endsWith('.js'));

  return files.reduce((routes, file) => {
    const exported = require(path.join(dirPath, file));
    return { ...routes, ...exported };
  }, {});
};

const setupExtensions = async (app, db) => {
  if (!extensionsPath) {
    logger.info('No extensions directory provided');
    return;
  }

  const routes = loadExtensionRoutes(extensionsPath);
  const routeCount = Object.keys(routes).length;

  if (routeCount === 0) {
    logger.info(`No extension routes found in ${extensionsPath}`);
    return;
  }

  logger.info(
    `Loading ${routeCount} extension route(s) from ${extensionsPath}`,
  );

  Object.entries(routes).forEach(([key, route]) => {
    const method = String(route.method || '').toLowerCase();
    const registerRoute = app[method];

    if (typeof registerRoute !== 'function') {
      logger.warn(
        `Skipping extension route '${key}': unsupported method '${route.method}'`,
      );
      return;
    }

    const handler = route.auth
      ? withAuth(route.auth, route.handler, db)
      : (req, res) => route.handler(req, res, db);

    registerRoute.call(app, route.path, handler);
    logger.info(
      ` > ${route.method} ${route.path}${route.auth ? ' (auth required)' : ''}`,
    );
  });
};

module.exports = {
  setupExtensions,
};

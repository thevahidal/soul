const jwt = require('jsonwebtoken');

const config = require('../config');
const { rowService } = require('../services');
const { accessDictinoary } = require('../utils');

const authorize = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  const tableName = req.url.split('/')[1];
  const access = accessDictinoary[req.method];

  try {
    //verify the token and extract the payload
    const payload = await verifyToken(authHeader);

    //if the user is a super_user allow access to the resource
    if (payload.is_super_user) {
      next();
    } else {
      if (checkPermission({ tableName, access })) {
        next();
      } else {
        res.status(403).json({
          message: 'Not Authorized'
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(403).json({
      message: 'Not Authorized',
      error: error.details
    });
  }
};

const checkPermission = ({ tableName, access }) => {
  let hasPermission = false;

  const permission = rowService.get({
    schemaString: '_default_permissions.*',
    tableName: '_default_permissions',
    extendString: '',
    whereString: ` WHERE _default_permissions.table_name = '${tableName}' AND  _default_permissions.${access} = 'true'`,
    orderString: '',
    limit: 10,
    page: 0,
    whereStringValues: []
  });

  if (permission.length >= 1) {
    hasPermission = true;
  }

  return hasPermission;
};

const verifyToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Not Authorized');
  }

  const token = authHeader.split(' ')[1];
  const payload = jwt.verify(token, config.jwtSecret);
  return payload;
};

module.exports = { authorize };

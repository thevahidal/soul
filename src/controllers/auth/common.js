const { rowService } = require('../../services');
const { dbConstants } = require('../../constants');

const { USERS_TABLE } = dbConstants;

const isUsernameTaken = (username) => {
  const users = rowService.get({
    tableName: USERS_TABLE,
    whereString: 'WHERE username=?',
    whereStringValues: [username],
  });

  return users.length > 0;
};

module.exports = { isUsernameTaken };

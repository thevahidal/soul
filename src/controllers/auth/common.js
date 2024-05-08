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

const checkAuthConfigs = ({ auth, tokenSecret }) => {
  if (auth && !tokenSecret) {
    throw new Error(
      'You need to provide a token secret either from the CLI or from your environment variables',
    );
  }
};

module.exports = { isUsernameTaken, checkAuthConfigs };

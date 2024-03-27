const db = require('../db');
const rowService = require('./rowService')(db);

const { constantRoles, dbConstants } = require('../constants');

const {
  USERS_TABLE,
  ROLES_TABLE,
  USERS_ROLES_TABLE,
  ROLES_PERMISSIONS_TABLE,
  tableFields,
} = dbConstants;

module.exports = () => {
  return {
    getUsersByUsername({ username }) {
      const users = rowService.get({
        tableName: USERS_TABLE,
        whereString: `WHERE ${tableFields.USERNAME} =?`,
        whereStringValues: [username],
      });

      return users;
    },

    getUsersById({ userId }) {
      const users = rowService.get({
        tableName: USERS_TABLE,
        whereString: `WHERE ${tableFields.ID}=?`,
        whereStringValues: [userId],
      });

      return users;
    },

    getAllUsers() {
      const users = rowService.get({
        tableName: USERS_TABLE,
        whereString: '',
        whereStringValues: [],
      });

      return users;
    },

    getPermissionByRoleIds({ roleIds }) {
      const permissions = rowService.get({
        tableName: ROLES_PERMISSIONS_TABLE,
        whereString: `WHERE ${tableFields.ROLE_ID} IN (${roleIds.map(
          () => '?',
        )})`,
        whereStringValues: [...roleIds],
        limit: 10000,
      });

      return permissions;
    },

    getUserRoleByUserId({ userId }) {
      const userRoles = rowService.get({
        tableName: USERS_ROLES_TABLE,
        whereString: `WHERE ${tableFields.USER_ID} =?`,
        whereStringValues: [userId],
      });

      return userRoles;
    },

    getDefaultRole() {
      const defaultRole = rowService.get({
        tableName: ROLES_TABLE,
        whereString: `WHERE ${tableFields.ROLE_NAME}=?`,
        whereStringValues: [constantRoles.DEFAULT_ROLE],
      });

      return defaultRole;
    },
  };
};

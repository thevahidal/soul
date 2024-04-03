const db = require('../db');
const rowService = require('./rowService')(db);

const { constantRoles, dbConstants } = require('../constants');

const {
  USERS_TABLE,
  ROLES_TABLE,
  USERS_ROLES_TABLE,
  ROLES_PERMISSIONS_TABLE,
  REVOKED_REFRESH_TOKENS_TABLE,
  tableFields,
} = dbConstants;

module.exports = (db) => {
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

    // TODO: bypass pagination by providing query param for number of rows
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

    saveRevokedRefreshToken({ refreshToken, expiresAt }) {
      const { lastInsertRowid } = rowService.save({
        tableName: REVOKED_REFRESH_TOKENS_TABLE,
        fields: {
          refresh_token: refreshToken,
          expires_at: expiresAt,
        },
      });

      return { id: lastInsertRowid };
    },

    getRevokedRefreshToken({ refreshToken }) {
      const token = rowService.get({
        tableName: REVOKED_REFRESH_TOKENS_TABLE,
        whereString: `WHERE ${tableFields.REFRESH_TOKEN}=?`,
        whereStringValues: [refreshToken],
      });

      return token;
    },

    deleteRevokedRefreshTokens({ lookupField }) {
      const query = `DELETE FROM ${REVOKED_REFRESH_TOKENS_TABLE} ${lookupField}`;
      const statement = db.prepare(query);
      const result = statement.run();
      return result;
    },
  };
};

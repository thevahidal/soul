const USERS_TABLE = '_users';
const ROLES_TABLE = '_roles';
const USERS_ROLES_TABLE = '_users_roles';
const ROLES_PERMISSIONS_TABLE = '_roles_permissions';
const REVOKED_REFRESH_TOKENS_TABLE = '_revoked_refresh_tokens';

module.exports = {
  // db table names
  USERS_TABLE,
  ROLES_TABLE,
  USERS_ROLES_TABLE,
  ROLES_PERMISSIONS_TABLE,
  REVOKED_REFRESH_TOKENS_TABLE,

  reservedTableNames: [
    USERS_TABLE,
    ROLES_TABLE,
    USERS_ROLES_TABLE,
    ROLES_PERMISSIONS_TABLE,
  ],

  constraints: {
    UNIQUE_USERS_ROLE: 'unique_users_role',
    UNIQUE_ROLES_TABLE: 'unique_ROLES_TABLE',
  },

  tableFields: {
    ID: 'id',

    // _role fields
    ROLE_NAME: 'name',

    // _user fields
    USERNAME: 'username',
    HASHED_PASSWORD: 'hashed_password',
    SALT: 'salt',
    IS_SUPERUSER: 'is_superuser',

    // _roles_permissions fields
    ROLE_ID: 'role_id',
    TABLE_NAME: 'table_name',
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',

    // _users_roles fields
    USER_ID: 'user_id',

    //_revoked_refresh_tokens
    REFRESH_TOKEN: 'refresh_token',
    EXPIRES_AT: 'expires_at',
  },
};

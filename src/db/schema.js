const { dbConstants } = require('../constants');

const { tableFields, ROLES_TABLE, USERS_TABLE } = dbConstants;

module.exports = {
  roleSchema: [
    {
      name: tableFields.ROLE_NAME,
      type: 'TEXT',
      primaryKey: false,
      notNull: true,
      unique: true,
    },
  ],

  userSchema: [
    {
      name: tableFields.USERNAME,
      type: 'TEXT',
      primaryKey: false,
      notNull: true,
      unique: true,
    },
    {
      name: tableFields.HASHED_PASSWORD,
      type: 'TEXT',
      primaryKey: false,
      notNull: true,
      unique: false,
    },
    {
      name: tableFields.SALT,
      type: 'TEXT',
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: tableFields.IS_SUPERUSER,
      type: 'BOOLEAN',
      primaryKey: false,
      notNull: true,
      unique: false,
    },
  ],

  rolePermissionSchema: [
    {
      name: tableFields.ROLE_ID,
      type: 'NUMERIC',
      primaryKey: false,
      notNull: true,
      unique: false,
      foreignKey: { table: ROLES_TABLE, column: tableFields.ID },
    },

    {
      name: tableFields.TABLE_NAME,
      type: 'TEXT',
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: tableFields.CREATE,
      type: 'BOOLEAN',
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: tableFields.READ,
      type: 'BOOLEAN',
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: tableFields.UPDATE,
      type: 'BOOLEAN',
      primaryKey: false,
      notNull: true,
      unique: false,
    },

    {
      name: tableFields.DELETE,
      type: 'BOOLEAN',
      primaryKey: false,
      notNull: true,
      unique: false,
    },
  ],

  usersRoleSchema: [
    {
      name: tableFields.USER_ID,
      type: 'NUMERIC',
      primaryKey: false,
      notNull: true,
      unique: false,
      foreignKey: { table: USERS_TABLE, column: tableFields.ID },
    },

    {
      name: tableFields.ROLE_ID,
      type: 'NUMERIC',
      primaryKey: false,
      notNull: true,
      unique: false,
      foreignKey: { table: ROLES_TABLE, column: tableFields.ID },
    },
  ],
};

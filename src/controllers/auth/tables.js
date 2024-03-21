const { tableService, rowService } = require('../../services');
const { constantRoles, dbConstants } = require('../../constants');
const schema = require('../../db/schema');

const {
  USERS_TABLE,
  ROLES_TABLE,
  USERS_ROLES_TABLE,
  ROLES_PERMISSIONS_TABLE,
  constraints,
  tableFields,
} = dbConstants;

const createDefaultTables = async () => {
  let roleId;

  // check if the default tables are already created
  const roleTable = tableService.checkTableExists(ROLES_TABLE);
  const usersTable = tableService.checkTableExists(USERS_TABLE);
  const rolesPermissionTable = tableService.checkTableExists(
    ROLES_PERMISSIONS_TABLE,
  );
  const usersRolesTable = tableService.checkTableExists(USERS_ROLES_TABLE);

  // create _users table
  if (!usersTable) {
    tableService.createTable(USERS_TABLE, schema.userSchema);
  }

  // create _users_roles table
  if (!usersRolesTable) {
    tableService.createTable(
      USERS_ROLES_TABLE,

      schema.usersRoleSchema,
      {
        multipleUniqueConstraints: {
          name: constraints.UNIQUE_USERS_ROLE,
          fields: [tableFields.USER_ID, tableFields.USER_ID],
        },
      },
    );
  }

  // create _roles table
  if (!roleTable) {
    tableService.createTable(ROLES_TABLE, schema.roleSchema);

    // create a default role in the _roles table
    const role = rowService.save({
      tableName: ROLES_TABLE,
      fields: { name: constantRoles.DEFAULT_ROLE },
    });
    roleId = role.lastInsertRowid;
  }

  // create _roles_permissions table
  if (!rolesPermissionTable && roleId) {
    tableService.createTable(
      ROLES_PERMISSIONS_TABLE,
      schema.rolePermissionSchema,
      {
        multipleUniqueConstraints: {
          name: constraints.UNIQUE_ROLES_TABLE,
          fields: [tableFields.ROLE_ID, tableFields.TABLE_NAME],
        },
      },
    );

    // fetch all DB tables
    const tables = tableService.listTables();

    // add permission for the default role (for each db table)
    const permissions = [];
    for (const table of tables) {
      permissions.push({
        role_id: roleId,
        table_name: table.name,
        create: 0,
        read: 1,
        update: 0,
        delete: 0,
      });
    }

    // store the permissions in the db
    rowService.bulkWrite({
      tableName: ROLES_PERMISSIONS_TABLE,
      fields: permissions,
    });
  }
};

module.exports = {
  createDefaultTables,
};

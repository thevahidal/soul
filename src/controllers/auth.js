const { tableService } = require('../services');
const { rowService } = require('../services');
const { dbTables, constantRoles } = require('../constants');

const createDefaultTables = async () => {
  let roleId;

  // check if the default tables are already created
  const roleTable = tableService.checkTableExists('_roles');
  const usersTable = tableService.checkTableExists('_users');
  const rolesPermissionTable =
    tableService.checkTableExists('_roles_permissions');
  const usersRolesTable = tableService.checkTableExists('_users_roles');

  // create _users table
  if (!usersTable) {
    // create the _users table
    tableService.createTable('_users', dbTables.userSchema);
  }

  // create _users_roles table
  if (!usersRolesTable) {
    // create the _users_roles table
    tableService.createTable('_users_roles', dbTables.usersRoleSchema);
  }

  // create _roles table
  if (!roleTable) {
    // create the _role table
    tableService.createTable('_roles', dbTables.roleSchema);

    // create a default role in the _roles table
    const role = rowService.save({
      tableName: '_roles',
      fields: { name: constantRoles.DEFAULT_ROLE },
    });
    roleId = role.lastInsertRowid;
  }

  // create _roles_permissions table
  if (!rolesPermissionTable && roleId) {
    // create the _roles_permissions table
    tableService.createTable(
      '_roles_permissions',
      dbTables.rolePermissionSchema,
      {
        multipleUniqueConstraints: {
          name: 'unique_role_table',
          fields: ['role_id', 'table_name'],
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
        create: 'false',
        read: 'true',
        update: 'false',
        delete: 'false',
      });
    }

    // store the permissions in the db
    rowService.bulkWrite({
      tableName: '_roles_permissions',
      fields: permissions,
    });
  }
};

module.exports = { createDefaultTables };

const { tableService } = require('../services');
const { dbTables } = require('../constants');

const createDefaultTables = async () => {
  //1. Check if the default tables are already created
  const roleTable = tableService.checkTableExists('_roles');
  const usersTable = tableService.checkTableExists('_users');
  const rolesPermissionTable =
    tableService.checkTableExists('_roles_permissions');
  const usersRolesTable = tableService.checkTableExists('_users_roles');

  //2. Create default auth tables
  if (!roleTable) {
    tableService.createTable('_roles', dbTables.roleSchema);
  }

  if (!usersTable) {
    tableService.createTable('_users', dbTables.userSchema);
  }

  if (!usersRolesTable) {
    tableService.createTable('_users_roles', dbTables.usersRoleSchema);
  }

  if (!rolesPermissionTable) {
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
  }
};

module.exports = { createDefaultTables };

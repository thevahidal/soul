const { tableService } = require('../services');
const { rowService } = require('../services');
const { dbTables } = require('../constants');

const createDefaultTables = async () => {
  // check if the default tables are already created
  const roleTable = tableService.checkTableExists('_roles');
  const usersTable = tableService.checkTableExists('_users');
  const rolesPermissionTable =
    tableService.checkTableExists('_roles_permissions');
  const usersRolesTable = tableService.checkTableExists('_users_roles');

  if (!usersTable) {
    // create the _users table
    tableService.createTable('_users', dbTables.userSchema);
  }

  if (!usersRolesTable) {
    // create the _users_roles table
    tableService.createTable('_users_roles', dbTables.usersRoleSchema);
  }

  if (!roleTable && !rolesPermissionTable) {
    // create the _role table
    tableService.createTable('_roles', dbTables.roleSchema);

    // create a default role in the _roles table
    const role = rowService.save({
      tableName: '_roles',
      fields: { name: 'defaultt' },
    });
    const roleId = role.lastInsertRowid;

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

const updateUser = async (fields) => {
  const { id, password, is_superuser } = fields;

  // find the user by using the id field
  //   const user = rowService.get({ schemaString: '*',
  //     tableName: '_users',
  //     whereString: 'WHERE id= `${id}`',
  //     // orderString,
  //     // limit,
  //     // page: limit * (page - 1),
  //     // whereStringValues})
  // })
  try {
    const user = rowService.get({
      tableName: '_users',
      whereString: 'WHERE id=?',
      whereStringValues: [id],
    });

    console.log(user, password, is_superuser);
  } catch (error) {
    console.log(error);
  }
};

module.exports = { createDefaultTables, updateUser };

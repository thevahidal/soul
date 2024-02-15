const { tableService } = require('../services');
const { rowService } = require('../services');
const { dbTables } = require('../constants');
const { hashPassword } = require('../utils');

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
  let newHashedPassword, newSalt;
  let fieldsString = '';

  try {
    // find the user by using the id field
    let user = rowService.get({
      tableName: '_users',
      whereString: 'WHERE id=?',
      whereStringValues: [id],
    });

    // abort if the id is invalid
    if (user.length === 0) {
      console.log('The user id you passed does not exist in the database');
      process.exit(1);
    }

    user = user[0];

    // check if the is_superuser field is passed
    if (is_superuser !== undefined) {
      fieldsString = `is_superuser = '${is_superuser}', `;
    }

    // if the password is sent from the CLI, update it
    if (password) {
      if (password.length < 8) {
        console.log('Your password should be at least 8 charachters long');
        process.exit(1);
      }

      //hash the password
      const { hashedPassword, salt } = await hashPassword(password, 10);
      newHashedPassword = hashedPassword;
      newSalt = salt;
      fieldsString += `hashed_password = '${newHashedPassword}', salt = '${newSalt}'`;
    }

    // update the user
    rowService.update({
      tableName: '_users',
      lookupField: `id`,
      fieldsString,
      pks: `${id}`,
    });

    console.log(
      'User updated successfully, you can now restart soul without the updateuser command',
    );
    process.exit(1);
  } catch (error) {
    console.log(error);
  }
};

module.exports = { createDefaultTables, updateUser };

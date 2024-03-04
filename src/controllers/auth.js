const { tableService } = require('../services');
const { rowService } = require('../services');
const { dbTables } = require('../constants');
const config = require('../config');
const {
  hashPassword,
  checkPasswordStrength,
  comparePasswords,
  generateToken,
} = require('../utils');

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
      fields: { name: 'default' },
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

const registerUser = async (req, res) => {
  const { username, password } = req.body.fields;

  try {
    // check if the username is taken
    let user = rowService.get({
      tableName: '_users',
      whereString: 'WHERE username=?',
      whereStringValues: [username],
    });

    if (user.length > 0) {
      return res.status(409).send({ message: 'This username is taken' });
    }

    // check if the password is weak
    if (['Too weak', 'Weak'].includes(checkPasswordStrength(password))) {
      return res.status(400).send({
        message: 'This password is weak, please use another password',
      });
    }

    // hash the password
    const { salt, hashedPassword } = await hashPassword(password, 10);

    // // create the user
    const newUser = rowService.save({
      tableName: '_users',
      fields: {
        username,
        salt,
        hashed_password: hashedPassword,
        is_superuser: 'false',
      },
    });

    // find the default role from the DB
    let defaultRole = rowService.get({
      tableName: '_roles',
      whereString: 'WHERE name=?',
      whereStringValues: ['default'],
    });

    if (defaultRole.length <= 0) {
      return res.status(500).send({
        message: 'Please restart soul so a default role can be created',
      });
    }

    // create a role for the user
    rowService.save({
      tableName: '_users_roles',
      fields: { user_id: newUser.lastInsertRowid, role_id: defaultRole[0].id },
    });

    res.status(201).send({ message: 'Row Inserted' });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: error.message });
  }
};

const obtainAccessToken = async (req, res) => {
  // extract payload
  const { username, password } = req.body.fields;

  try {
    // check if the username exists in the Db
    let users = rowService.get({
      tableName: '_users',
      whereString: 'WHERE username=?',
      whereStringValues: [username],
    });

    if (users.length <= 0) {
      return res.status(401).send({ message: 'Invalid username or password' });
    }

    // check if the password is valid
    let user = users[0];
    const isMatch = await comparePasswords(password, user.hashed_password);

    if (!isMatch) {
      return res.status(401).send({ message: 'Invalid username or password' });
    }

    // get the user roles from the DB
    const userRoles = rowService.get({
      tableName: '_users_roles',
      whereString: 'WHERE user_id=?',
      whereStringValues: [user.id],
    });

    if (userRoles < 0) {
      return res.status(404).send({ message: 'Default role not found' });
    }

    const payload = {
      username: user.username,
      userId: user.id,
      roleId: userRoles.role_id,
    };

    // generate an access token
    const accessToken = await generateToken(
      { subject: 'accessToken', ...payload },
      config.accessTokenSecret,
      config.accessTokenExpirationTime,
    );

    // generate a refresh token
    const refreshToken = await generateToken(
      { subject: 'refreshToken', ...payload },
      config.refreshTokenSecret,
      config.refreshTokenExpirationTime,
    );

    // set the token in the cookie
    let cookieOptions = { httpOnly: true, secure: false, Path: '/' };
    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(201).send({ message: 'Success', data: { userId: user.id } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
      error: error,
    });
  }
};

module.exports = {
  createDefaultTables,
  updateUser,
  registerUser,
  obtainAccessToken,
};

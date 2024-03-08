const { tableService, rowService } = require('../services');
const config = require('../config');
const {
  hashPassword,
  checkPasswordStrength,
  comparePasswords,
  generateToken,
  decodeToken,
  toBoolean,
} = require('../utils');

const { dbTables, constantRoles, apiConstants } = require('../constants');

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
    tableService.createTable(
      '_users_roles',

      dbTables.usersRoleSchema,
      {
        multipleUniqueConstraints: {
          name: 'unique_users_role',
          fields: ['user_id', 'role_id'],
        },
      },
    );
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

const updateSuperuser = async (fields) => {
  const { id, password, is_superuser } = fields;
  let newHashedPassword, newSalt;
  let fieldsString = '';

  try {
    // find the user by using the id field
    const users = rowService.get({
      tableName: '_users',
      whereString: 'WHERE id=?',
      whereStringValues: [id],
    });

    // abort if the id is invalid
    if (users.length === 0) {
      console.log('The user id you passed does not exist in the database');
      process.exit(1);
    }

    // check if the is_superuser field is passed
    if (is_superuser !== undefined) {
      fieldsString = `is_superuser = '${is_superuser}'`;
    }

    // if the password is sent from the CLI, update it
    if (password) {
      // check if the password is weak
      if (
        [apiConstants.PASSWORD.TOO_WEAK, apiConstants.PASSWORD.WEAK].includes(
          checkPasswordStrength(password),
        )
      ) {
        console.log('Your password should be at least 8 charachters long');
        process.exit(1);
      }

      //hash the password
      const { hashedPassword, salt } = await hashPassword(password, 10);
      newHashedPassword = hashedPassword;
      newSalt = salt;

      fieldsString = `${
        fieldsString ? fieldsString + ', ' : ''
      }hashed_password = '${newHashedPassword}', salt = '${newSalt}'`;
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
    if (!username) {
      return res.status(400).send({ message: 'username is required' });
    }

    if (!password) {
      return res.status(400).send({ message: 'password is required' });
    }

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
    if (
      [apiConstants.PASSWORD.TOO_WEAK, apiConstants.PASSWORD.WEAK].includes(
        checkPasswordStrength(password),
      )
    ) {
      return res.status(400).send({
        message: 'This password is weak, please use another password',
      });
    }

    // hash the password
    const { salt, hashedPassword } = await hashPassword(password, 10);

    // create the user
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
      whereStringValues: [constantRoles.DEFAULT_ROLE],
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
    const users = rowService.get({
      tableName: '_users',
      whereString: 'WHERE username=?',
      whereStringValues: [username],
    });

    if (users.length <= 0) {
      return res.status(401).send({ message: 'Invalid username or password' });
    }

    // check if the password is valid
    const user = users[0];
    const isMatch = await comparePasswords(password, user.hashed_password);

    if (!isMatch) {
      return res.status(401).send({ message: 'Invalid username or password' });
    }

    let userRoles, permissions, roleIds;

    // if the user is not a superuser get the role and its permission from the DB
    if (!toBoolean(user.is_superuser)) {
      userRoles = rowService.get({
        tableName: '_users_roles',
        whereString: 'WHERE user_id=?',
        whereStringValues: [user.id],
      });

      roleIds = userRoles.map((role) => role.role_id);

      // get the permission of the role
      permissions = rowService.get({
        tableName: '_roles_permissions',
        whereString: `WHERE role_id IN (${roleIds.map(() => '?')})`,
        whereStringValues: [...roleIds],
      });
    }

    const payload = {
      username: user.username,
      userId: user.id,
      isSuperuser: user.is_superuser,
      roleIds,
      permissions,
    };

    // generate an access token
    const accessToken = await generateToken(
      { subject: 'accessToken', ...payload },
      config.tokenSecret,
      config.accessTokenExpirationTime,
    );

    // generate a refresh token
    const refreshToken = await generateToken(
      { subject: 'refreshToken', ...payload },
      config.tokenSecret,
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

const refreshAccessToken = async (req, res) => {
  try {
    // extract the payload from the token and verify it
    const payload = await decodeToken(
      req.cookies.refreshToken,
      config.tokenSecret,
    );

    // find the user
    const users = rowService.get({
      tableName: '_users',
      whereString: 'WHERE id=?',
      whereStringValues: [payload.userId],
    });

    if (users.length <= 0) {
      return res
        .status(401)
        .send({ message: `User with userId = ${payload.userId} not found` });
    }

    let userRoles, permissions, roleIds;
    const user = users[0];

    // if the user is not a superuser get the role and its permission from the DB
    if (!toBoolean(user.is_superuser)) {
      userRoles = rowService.get({
        tableName: '_users_roles',
        whereString: 'WHERE user_id=?',
        whereStringValues: [user.id],
      });

      roleIds = userRoles.map((role) => role.role_id);

      // get the permission of the role
      permissions = rowService.get({
        tableName: '_roles_permissions',
        whereString: `WHERE role_id IN (${roleIds.map(() => '?')})`,
        whereStringValues: [...roleIds],
      });
    }

    const newPayload = {
      username: user.username,
      userId: user.id,
      isSuperuser: user.is_superuser,
      roleIds,
      permissions,
    };

    // generate an access token
    const accessToken = await generateToken(
      { subject: 'accessToken', ...newPayload },
      config.tokenSecret,
      config.accessTokenExpirationTime,
    );

    // generate a refresh token
    const refreshToken = await generateToken(
      { subject: 'refreshToken', ...newPayload },
      config.tokenSecret,
      config.refreshTokenExpirationTime,
    );

    // set the token in the cookie
    let cookieOptions = { httpOnly: true, secure: false, Path: '/' };
    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(201).send({ message: 'Success', data: { userId: user.id } });
  } catch (error) {
    res.status(401).send({ message: 'Invalid refresh token' });
  }
};

const changePassword = async (req, res) => {
  const userInfo = req.user;
  const { currentPassword, newPassword } = req.body.fields;

  try {
    // get the user from the Db
    const users = rowService.get({
      tableName: '_users',
      whereString: 'WHERE id=?',
      whereStringValues: [userInfo.userId],
    });

    if (users.length <= 0) {
      return res.status(401).send({ message: 'User not found' });
    }

    const user = users[0];

    // check if the users current password is valid
    const isMatch = await comparePasswords(
      currentPassword,
      user.hashed_password,
    );

    if (!isMatch) {
      return res.status(401).send({ message: 'Invalid current password' });
    }

    // check if the new password is strong
    if (
      [apiConstants.PASSWORD.TOO_WEAK, apiConstants.PASSWORD.WEAK].includes(
        checkPasswordStrength(newPassword),
      )
    ) {
      return res.status(400).send({
        message: 'This password is weak, please use another password',
      });
    }

    // hash the password
    const { salt, hashedPassword } = await hashPassword(newPassword, 10);

    user.salt = salt;
    user.hashed_password = hashedPassword;

    // update the user
    rowService.update({
      tableName: '_users',
      lookupField: `id`,
      fieldsString: `hashed_password = '${hashedPassword}', salt = '${salt}'`,
      pks: `${user.id}`,
    });

    res.status(201).send({
      message: 'Password updated successfully',
      data: { id: user.id, username: user.username },
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const createInitialUser = async () => {
  // extract some fields from the environment variables or from the CLI
  const { initialUserUsername: username, initialUserPassword: password } =
    config;

  try {
    // check if there is a superuser in the DB
    const users = rowService.get({
      tableName: '_users',
      whereString: '',
      whereStringValues: [],
    });

    if (users.length <= 0) {
      // check if initial superuser username is passed from the  env or CLI
      if (!username) {
        console.error(
          'Error: You should pass the initial users username either from the CLI with the --iuu or from the environment variable using the INITIAL_USER_USERNAME flag',
        );
        process.exit(1);
      }

      // check if initial superuser password is passed from the env or CLI
      if (!password) {
        console.error(
          'Error: You should pass the initial users password either from the CLI with the --iup or from the environment variable using the INITIAL_USER_PASSWORD flag',
        );
        process.exit(1);
      }

      // check if the usernmae is taken
      const users = rowService.get({
        tableName: '_users',
        whereString: 'WHERE username=?',
        whereStringValues: [username],
      });

      if (users.length > 0) {
        console.error(
          'Error: The username you passed for the initial user is already taken, please use another username',
        );
        process.exit(1);
      }

      // check if the password is strong
      if (['Too weak', 'Weak'].includes(checkPasswordStrength(password))) {
        console.error(
          'Error: The password you passed for the initial user is weak, please use another password',
        );
        process.exit(1);
      }

      // hash the password
      const { hashedPassword, salt } = await hashPassword(password, 10);

      // create the superuser
      rowService.save({
        tableName: '_users',
        fields: {
          username,
          hashed_password: hashedPassword,
          salt,
          is_superuser: 'false',
        },
      });

      console.log('Initial user created');
    } else {
      console.log('Initial user is already created');
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  createDefaultTables,
  updateSuperuser,
  registerUser,
  obtainAccessToken,
  refreshAccessToken,
  changePassword,
  createInitialUser,
};

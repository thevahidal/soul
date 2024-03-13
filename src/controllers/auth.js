const { tableService, rowService } = require('../services');
const { constantRoles, apiConstants, dbConstants } = require('../constants');
const schema = require('../db/schema');
const config = require('../config');
const {
  hashPassword,
  checkPasswordStrength,
  comparePasswords,
  generateToken,
  decodeToken,
  toBoolean,
} = require('../utils');

const { USER_TABLE, ROLE_TABLE, USERS_ROLES_TABLE, ROLE_PERMISSIONS_TABLE } =
  dbConstants;

const createDefaultTables = async () => {
  let roleId;

  // check if the default tables are already created
  const roleTable = tableService.checkTableExists(ROLE_TABLE);
  const usersTable = tableService.checkTableExists(USER_TABLE);
  const rolesPermissionTable = tableService.checkTableExists(
    ROLE_PERMISSIONS_TABLE,
  );
  const usersRolesTable = tableService.checkTableExists(USERS_ROLES_TABLE);

  // create _users table
  if (!usersTable) {
    tableService.createTable(USER_TABLE, schema.userSchema);
  }

  // create _users_roles table
  if (!usersRolesTable) {
    tableService.createTable(
      USERS_ROLES_TABLE,

      schema.usersRoleSchema,
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
    tableService.createTable(ROLE_TABLE, schema.roleSchema);

    // create a default role in the _roles table
    const role = rowService.save({
      tableName: ROLE_TABLE,
      fields: { name: constantRoles.DEFAULT_ROLE },
    });
    roleId = role.lastInsertRowid;
  }

  // create _roles_permissions table
  if (!rolesPermissionTable && roleId) {
    tableService.createTable(
      ROLE_PERMISSIONS_TABLE,
      schema.rolePermissionSchema,
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
      tableName: ROLE_PERMISSIONS_TABLE,
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
      tableName: USER_TABLE,
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
      tableName: USER_TABLE,
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
  /* 	
    #swagger.tags = ['Auth']
    #swagger.summary = 'Register User' 
    #swagger.description = 'Endpoint to signup'

     #swagger.parameters['username'] = {
      in: 'body',
      required: true,
      type: 'object',
      schema: { $ref: '#/definitions/UserRegistrationRequestBody' }
    }
  */

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
      tableName: USER_TABLE,
      whereString: 'WHERE username=?',
      whereStringValues: [username],
    });

    if (user.length > 0) {
      return res.status(409).send({ message: 'This username is taken' });

      /*
      #swagger.responses[409] = {
        description: 'Username taken error',
        schema: {
          $ref: '#/definitions/UsernameTakenErrorResponse'
        }
      }
    */
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

      /*
      #swagger.responses[400] = {
        description: 'Weak password error',
        schema: {
          $ref: '#/definitions/WeakPasswordErrorResponse'
        }
      }
    */
    }

    // hash the password
    const { salt, hashedPassword } = await hashPassword(password, 10);

    // create the user
    const newUser = rowService.save({
      tableName: USER_TABLE,
      fields: {
        username,
        salt,
        hashed_password: hashedPassword,
        is_superuser: 'false',
      },
    });

    // find the default role from the DB
    let defaultRole = rowService.get({
      tableName: ROLE_TABLE,
      whereString: 'WHERE name=?',
      whereStringValues: [constantRoles.DEFAULT_ROLE],
    });

    if (defaultRole.length <= 0) {
      return res.status(500).send({
        message: 'Please restart soul so a default role can be created',
      });
      /*
      #swagger.responses[500] = {
        description: 'Server error',
        schema: {
          $ref: '#/definitions/DefaultRoleNotCreatedErrorResponse'
        }
      }
    */
    }

    // create a role for the user
    rowService.save({
      tableName: USERS_ROLES_TABLE,
      fields: { user_id: newUser.lastInsertRowid, role_id: defaultRole[0].id },
    });

    res.status(201).send({ message: 'Row Inserted' });

    /*
      #swagger.responses[201] = {
        description: 'Row inserted',
        schema: {
          $ref: '#/definitions/InsertRowSuccessResponse'
        }
      }
    */
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: error.message });
  }
};

const obtainAccessToken = async (req, res) => {
  /* 	
    #swagger.tags = ['Auth']
    #swagger.summary = 'Obtain Access Token' 
    #swagger.description = 'Endpoint to generate access and refresh tokens'

     #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      type: 'object',
      schema: { $ref: '#/definitions/ObtainAccessTokenRequestBody' }
    }
  */

  // extract payload
  const { username, password } = req.body.fields;

  try {
    // check if the username exists in the Db
    const users = rowService.get({
      tableName: USER_TABLE,
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
      /*
      #swagger.responses[401] = {
        description: 'Invalid username or password error',
        schema: {
          $ref: '#/definitions/InvalidCredentialErrorResponse'
        }
      }
    */
    }

    let userRoles, permissions, roleIds;

    // if the user is not a superuser get the role and its permission from the DB
    if (!toBoolean(user.is_superuser)) {
      userRoles = rowService.get({
        tableName: USERS_ROLES_TABLE,
        whereString: 'WHERE user_id=?',
        whereStringValues: [user.id],
      });

      if (userRoles <= 0) {
        return res
          .status(404)
          .send({ message: 'Role not found for this user' });
      }

      roleIds = userRoles.map((role) => role.role_id);

      // get the permission of the role
      permissions = rowService.get({
        tableName: ROLE_PERMISSIONS_TABLE,
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

    /*
      #swagger.responses[201] = {
        description: 'Access token and Refresh token generated',
        schema: {
          $ref: '#/definitions/ObtainAccessTokenSuccessResponse'
        }
      }
    */
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
      error: error,
    });
  }
};

const refreshAccessToken = async (req, res) => {
  /* 	
    #swagger.tags = ['Auth']
    #swagger.summary = 'Refresh Access Token' 
    #swagger.description = 'Endpoint to refresh access and refresh tokens'
  */

  try {
    // extract the payload from the token and verify it
    const payload = await decodeToken(
      req.cookies.refreshToken,
      config.tokenSecret,
    );

    // find the user
    const users = rowService.get({
      tableName: USER_TABLE,
      whereString: 'WHERE id=?',
      whereStringValues: [payload.userId],
    });

    if (users.length <= 0) {
      return res
        .status(401)
        .send({ message: `User with userId = ${payload.userId} not found` });

      /*
      #swagger.responses[401] = {
        description: 'User not found error',
        schema: {
          $ref: '#/definitions/UserNotFoundErrorResponse'
        }
      }
    */
    }

    let userRoles, permissions, roleIds;
    const user = users[0];

    // if the user is not a superuser get the role and its permission from the DB
    if (!toBoolean(user.is_superuser)) {
      userRoles = rowService.get({
        tableName: USERS_ROLES_TABLE,
        whereString: 'WHERE user_id=?',
        whereStringValues: [user.id],
      });

      roleIds = userRoles.map((role) => role.role_id);

      // get the permission of the role
      permissions = rowService.get({
        tableName: ROLE_PERMISSIONS_TABLE,
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

    res.status(200).send({ message: 'Success', data: { userId: user.id } });

    /*
      #swagger.responses[200] = {
        description: 'Access token refreshed',
        schema: {
          $ref: '#/definitions/RefreshAccessTokenSuccessResponse'
        }
      }
    */
  } catch (error) {
    res.status(403).send({ message: 'Invalid refresh token' });
    /*
      #swagger.responses[401] = {
        description: 'Invalid refresh token error',
        schema: {
          $ref: '#/definitions/InvalidRefreshTokenErrorResponse'
        }
      }
    */
  }
};

const changePassword = async (req, res) => {
  /* 	
    #swagger.tags = ['Auth']
    #swagger.summary = 'Change Password' 
    #swagger.description = 'Endpoint to change a password'

     #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      type: 'object',
      schema: {
          $ref: '#/definitions/ChangePasswordRequestBody'
      }
    }
  */

  const userInfo = req.user;
  const { currentPassword, newPassword } = req.body.fields;

  try {
    // get the user from the Db
    const users = rowService.get({
      tableName: USER_TABLE,
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
      /*
      #swagger.responses[401] = {
        description: 'User not found error',
        schema: {
          $ref: '#/definitions/InvalidPasswordErrorResponse'
        }
      }
    */
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

      /*
      #swagger.responses[400] = {
        description: 'Weak password error',
        schema: {
          $ref: '#/definitions/WeakPasswordErrorResponse'
        }
      }
    */
    }

    // hash the password
    const { salt, hashedPassword } = await hashPassword(newPassword, 10);

    user.salt = salt;
    user.hashed_password = hashedPassword;

    // update the user
    rowService.update({
      tableName: USER_TABLE,
      lookupField: `id`,
      fieldsString: `hashed_password = '${hashedPassword}', salt = '${salt}'`,
      pks: `${user.id}`,
    });

    res.status(200).send({
      message: 'Password updated successfully',
      data: { id: user.id, username: user.username },
    });

    /*
      #swagger.responses[200] = {
        description: 'Weak password error',
        schema: {
          $ref: '#/definitions/ChangePasswordSuccessResponse'
        }
      }
    */
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const createInitialUser = async () => {
  // extract some fields from the environment variables or from the CLI
  const { initialUserUsername: username, initialUserPassword: password } =
    config;

  try {
    // check if there is are users in the DB
    const users = rowService.get({
      tableName: USER_TABLE,
      whereString: '',
      whereStringValues: [],
    });

    if (users.length <= 0) {
      // check if initial users username is passed from the  env or CLI
      if (!username) {
        console.error(
          'Error: You should pass the initial users username either from the CLI with the --iuu or from the environment variable using the INITIAL_USER_USERNAME flag',
        );
        process.exit(1);
      }

      // check if initial users password is passed from the env or CLI
      if (!password) {
        console.error(
          'Error: You should pass the initial users password either from the CLI with the --iup or from the environment variable using the INITIAL_USER_PASSWORD flag',
        );
        process.exit(1);
      }

      // check if the usernmae is taken
      const users = rowService.get({
        tableName: USER_TABLE,
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
      if (
        [apiConstants.PASSWORD.TOO_WEAK, apiConstants.PASSWORD.WEAK].includes(
          checkPasswordStrength(password),
        )
      ) {
        console.error(
          'Error: The password you passed for the initial user is weak, please use another password',
        );
        process.exit(1);
      }

      // hash the password
      const { hashedPassword, salt } = await hashPassword(password, 10);

      // create the initial user
      const { lastInsertRowid: userId } = rowService.save({
        tableName: USER_TABLE,
        fields: {
          username,
          hashed_password: hashedPassword,
          salt,
          is_superuser: 'false',
        },
      });

      // get the default role from the DB
      const roles = rowService.get({
        tableName: ROLE_TABLE,
        whereString: 'WHERE name=?',
        whereStringValues: [constantRoles.DEFAULT_ROLE],
      });

      if (roles.length <= 0) {
        console.log(
          'Default role not found, please restart soul so a default role can be created',
        );
        process.exit(1);
      }

      const defaultRoleId = roles[0].id;

      // create a _users_role for the initial user
      rowService.save({
        tableName: USERS_ROLES_TABLE,
        fields: { user_id: userId, role_id: defaultRoleId },
      });

      console.log('Initial user created');
    } else {
      console.log('Initial user is already created');
    }
  } catch (error) {
    console.log(error);
  }
};

const isUsernameTaken = (username) => {
  let user = rowService.get({
    tableName: USER_TABLE,
    whereString: 'WHERE username=?',
    whereStringValues: [username],
  });

  return user.length > 0;
};

module.exports = {
  createDefaultTables,
  updateSuperuser,
  registerUser,
  obtainAccessToken,
  refreshAccessToken,
  changePassword,
  createInitialUser,
  isUsernameTaken,
};

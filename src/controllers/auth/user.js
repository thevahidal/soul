const { rowService, authService } = require('../../services');
const {
  apiConstants,
  dbConstants,
  responseMessages,
  authConstants,
} = require('../../constants');
const config = require('../../config');
const {
  hashPassword,
  checkPasswordStrength,
  comparePasswords,
} = require('../../utils');

const { USERS_TABLE, USERS_ROLES_TABLE, tableFields } = dbConstants;

const { SALT_ROUNDS } = authConstants;

const { successMessage, errorMessage, infoMessage } = responseMessages;

const updateSuperuser = async (fields) => {
  const { id, password, is_superuser } = fields;
  let newHashedPassword, newSalt;
  let fieldsString = '';

  try {
    // find the user by using the id field
    const users = authService.getUsersById({ userId: id });

    // abort if the id is invalid
    if (users.length === 0) {
      console.log(errorMessage.USER_NOT_FOUND_ERROR);
      process.exit(1);
    }

    // check if the is_superuser field is passed
    if (is_superuser !== undefined) {
      fieldsString = `${tableFields.IS_SUPERUSER} = '${is_superuser}'`;
    }

    // if the password is sent from the CLI, update it
    if (password) {
      // check if the password is weak
      if (
        [apiConstants.PASSWORD.TOO_WEAK, apiConstants.PASSWORD.WEAK].includes(
          checkPasswordStrength(password),
        )
      ) {
        console.log(errorMessage.WEAK_PASSWORD_ERROR);
        process.exit(1);
      }

      //hash the password
      const { hashedPassword, salt } = await hashPassword(
        password,
        SALT_ROUNDS,
      );
      newHashedPassword = hashedPassword;
      newSalt = salt;

      fieldsString = `${fieldsString ? fieldsString + ', ' : ''} ${
        tableFields.HASHED_PASSWORD
      } = '${newHashedPassword}', ${tableFields.SALT} = '${newSalt}'`;
    }

    // update the user
    rowService.update({
      tableName: USERS_TABLE,
      lookupField: tableFields.ID,
      fieldsString,
      pks: `${id}`,
    });

    console.log(successMessage.USER_UPDATE_SUCCESS);
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

  const { username, password, ...optionalFields } = req.body.fields;

  try {
    if (!username) {
      return res
        .status(400)
        .send({ message: errorMessage.USERNAME_REQUIRED_ERROR });
    }

    if (!password) {
      return res
        .status(400)
        .send({ message: errorMessage.PASSWORD_REQUIRED_ERROR });
    }

    // check if the username is taken
    const users = authService.getUsersByUsername({ username });

    if (users.length > 0) {
      return res
        .status(409)
        .send({ message: errorMessage.USERNAME_TAKEN_ERROR });

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
        message: errorMessage.WEAK_PASSWORD_ERROR,
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
    const { salt, hashedPassword } = await hashPassword(password, SALT_ROUNDS);

    // create the user
    const newUser = rowService.save({
      tableName: USERS_TABLE,
      fields: {
        username,
        salt,
        hashed_password: hashedPassword,
        is_superuser: 'false',
        ...optionalFields,
      },
    });

    // find the default role from the DB
    const defaultRole = authService.getDefaultRole();

    if (defaultRole.length <= 0) {
      return res.status(500).send({
        message: errorMessage.DEFAULT_ROLE_NOT_CREATED_ERROR,
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

    res.status(201).send({ message: successMessage.ROW_INSERTED });

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
    res.status(500).send({ message: errorMessage.SERVER_ERROR });
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
    const users = authService.getUsersById({ userId: userInfo.userId });

    if (users.length <= 0) {
      return res
        .status(401)
        .send({ message: errorMessage.USER_NOT_FOUND_ERROR });
    }

    const user = users[0];

    // check if the users current password is valid
    const isMatch = await comparePasswords(
      currentPassword,
      user.hashed_password,
    );

    if (!isMatch) {
      return res
        .status(401)
        .send({ message: errorMessage.INVALID_CURRENT_PASSWORD_ERROR });
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
        message: errorMessage.WEAK_PASSWORD_ERROR,
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
    const { salt, hashedPassword } = await hashPassword(
      newPassword,
      SALT_ROUNDS,
    );

    user.salt = salt;
    user.hashed_password = hashedPassword;

    // update the user
    rowService.update({
      tableName: USERS_TABLE,
      lookupField: tableFields.ID,
      fieldsString: `${tableFields.HASHED_PASSWORD} = '${hashedPassword}', ${tableFields.SALT} = '${salt}'`,
      pks: `${user.id}`,
    });

    res.status(200).send({
      message: successMessage.PASSWORD_UPDATE_SUCCESS,
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
    res.status(500).send({ message: errorMessage.SERVER_ERROR });
  }
};

const createInitialUser = async () => {
  // extract some fields from the environment variables or from the CLI
  const { initialUserUsername: username, initialUserPassword: password } =
    config;

  try {
    // check if there are users in the DB
    const users = authService.getAllUsers();

    if (users.length <= 0) {
      // check if initial users username is passed from the  env or CLI
      if (!username) {
        console.error(errorMessage.INITIAL_USER_USERNAME_NOT_PASSED_ERROR);
        process.exit(1);
      }

      // check if initial users password is passed from the env or CLI
      if (!password) {
        console.error(errorMessage.INITIAL_USER_PASSWORD_NOT_PASSED_ERROR);
        process.exit(1);
      }

      // check if the usernmae is taken
      const users = authService.getUsersByUsername({ username });

      if (users.length > 0) {
        console.error(errorMessage.USERNAME_TAKEN_ERROR);
        process.exit(1);
      }

      // check if the password is strong
      if (
        [apiConstants.PASSWORD.TOO_WEAK, apiConstants.PASSWORD.WEAK].includes(
          checkPasswordStrength(password),
        )
      ) {
        console.error(errorMessage.WEAK_PASSWORD_ERROR);
        process.exit(1);
      }

      // hash the password
      const { hashedPassword, salt } = await hashPassword(
        password,
        SALT_ROUNDS,
      );

      // create the initial user
      const { lastInsertRowid: userId } = rowService.save({
        tableName: USERS_TABLE,
        fields: {
          username,
          hashed_password: hashedPassword,
          salt,
          is_superuser: 'false',
        },
      });

      // get the default role from the DB
      const roles = authService.getDefaultRole();

      if (roles.length <= 0) {
        console.log(errorMessage.DEFAULT_ROLE_NOT_CREATED_ERROR);
        process.exit(1);
      }

      const defaultRoleId = roles[0].id;

      // create a _users_role for the initial user
      rowService.save({
        tableName: USERS_ROLES_TABLE,
        fields: { user_id: userId, role_id: defaultRoleId },
      });

      console.log(successMessage.INITIAL_USER_CREATED_SUCCESS);
    } else {
      console.log(infoMessage.INITIAL_USER_ALREADY_CREATED);
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  updateSuperuser,
  registerUser,
  changePassword,
  createInitialUser,
};

const bcrypt = require('bcrypt');
const JWT = require('jsonwebtoken');

const { tableService } = require('../services');
const { rowService } = require('../services');
const schema = require('../schemas/auth');
const config = require('../config');
const { verifyToken } = require('../middlewares/authorization');

const registerUser = async (req, res, next) => {
  const { fields: queryFields } = req.body;

  // Remove null values from fields for accurate query construction.
  const fields = Object.fromEntries(
    Object.entries(queryFields).filter(([_, value]) => value !== null)
  );

  try {
    //check if the user_name is taken
    const user = rowService.get({
      schemaString: '_users.*',
      tableName: '_users',
      extendString: '',
      whereString: ` WHERE _users.user_name = '${fields.user_name}'`,
      orderString: '',
      limit: 10,
      page: 0,
      whereStringValues: []
    });

    if (user.length > 0) {
      return res.status(400).json({
        message: 'This username is already taken',
        error: {}
      });
    }

    //Hash the password
    fields.hashed_password = await hashPassword(fields.password);
    fields.is_super_user = 'false';
    delete fields.password;

    //save the user
    const data = rowService.save({ tableName: '_users', fields });
    res.status(201).json({
      message: 'Row inserted',
      data
    });
    req.broadcast = {
      type: 'INSERT',
      data: {
        pk: data.lastInsertRowid,
        ...fields
      }
    };
    next();
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error
    });
  }
};

const obtainAccessToken = async (req, res, next) => {
  const { fields: body } = req.body;

  // Remove null values from fields for accurate query construction.
  const fields = Object.fromEntries(
    Object.entries(body).filter(([_, value]) => value !== null)
  );

  try {
    //check if the user name exists
    let user = rowService.get({
      schemaString: '_users.*',
      tableName: '_users',
      extendString: '',
      whereString: ` WHERE _users.user_name = '${fields.user_name}'`,
      orderString: '',
      limit: 10,
      page: 0,
      whereStringValues: []
    });

    if (user.length == 0) {
      return res.status(400).json({
        message: 'Invalid username or password',
        error: {}
      });
    }

    user = user[0];

    //check if the password is valid
    const isPasswordValid = await comparePasswords(
      fields.password,
      user.hashed_password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        message: 'Invalid username or password',
        error: {}
      });
    }

    //prepare the payload for the token
    const payload = {
      username: fields.user_name,
      is_super_user: toBoolean(user.is_super_user)
    };

    //generate token
    const token = await generateToken(payload, config.jwtExpirationTime);

    res.json({ token });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error
    });
  }
};

const refreshAccessToken = async (req, res, next) => {
  const { fields: body } = req.body;

  //Remove null values from fields for accurate query construction.
  const fields = Object.fromEntries(
    Object.entries(body).filter(([_, value]) => value !== null)
  );

  try {
    let { iat, exp, ...payload } = verifyToken(fields.token);

    //generate token
    const token = await generateToken(payload, config.jwtExpirationTime);

    res.json({ token });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: error.message,
      error: error
    });
  }
};

const createDefaultTables = async () => {
  //Create _default_permissions table
  const defaultPermissionTable = tableService.checkTableExists(
    '_default_permissions'
  );

  if (!defaultPermissionTable) {
    const dbTables = tableService.getTableNames();
    const defaultTables = [
      { name: '_users', type: 'default_table' },
      { name: '_roles', type: 'default_table' }
    ];
    const tableNames = [...dbTables, ...defaultTables];

    //create the _default_permissions table
    const tableColumns = [
      'table_name TEXT',
      'can_create BOOLEAN',
      'can_read BOOLEAN',
      'can_update BOOLEAN',
      'can_delete BOOLEAN'
    ];
    const permissionTable = tableService.createTable(
      '_default_permissions',
      tableColumns
    );

    //Add rows for the permission table
    tableNames.map((table) => {
      let accessRight = 'true';
      if (table.type === 'default_table') {
        accessRight = 'false';
      }

      const rowData = {
        tableName: '_default_permissions',
        fields: {
          table_name: table.name,
          can_create: accessRight,
          can_read: accessRight,
          can_update: accessRight,
          can_delete: accessRight
        }
      };

      rowService.save(rowData);
    });
  } else {
    console.log('_default_permission table is already created');
  }

  //Create _users and _roles tables
  const usersTable = tableService.checkTableExists('_users');
  if (!usersTable) {
    const tableColumns = [
      'first_name TEXT',
      'last_name TEXT',
      'user_name TEXT',
      'hashed_password TEXT',
      'is_super_user BOOLEAN'
    ];
    const user = tableService.createTable('_users', tableColumns);
  } else {
    console.log('_users table is already created');
  }
};

const createSuperUser = async (user) => {
  const { superUserUsername: username, superUserPassword: password } = config;

  try {
    //check if the username and password are valid
    if (username && password) {
      //check if the user_name is taken
      const user = rowService.get({
        schemaString: '_users.*',
        tableName: '_users',
        extendString: '',
        whereString: ` WHERE _users.user_name = '${username}'`,
        orderString: '',
        limit: 10,
        page: 0,
        whereStringValues: []
      });

      if (user.length > 0) {
        console.log(
          'Error: The username you passed for the superuser is already taken.'
        );
        process.exit(1);
      }

      const superUserData = {
        query: {},
        params: {},
        body: {
          fields: {
            first_name: 'Super',
            last_name: 'User',
            user_name: username,
            password,
            is_super_user: true
          }
        }
      };

      const { value, error } = schema.registerUser.validate(superUserData);
      if (error) {
        console.log('Error: Super User creation failed: ', error);
        process.exit(1);
      }

      //Hash the password
      const fields = value.body.fields;
      fields.hashed_password = await hashPassword(fields.password);
      fields.is_super_user = 'true';
      delete fields.password;

      //save the user
      const result = rowService.save({ tableName: '_users', fields });
      console.log('Super user created successfully ', result);
    } else {
      console.warn(
        'Please pass a username and a password from the CLI to create a super user'
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const hashPassword = async (password) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

const comparePasswords = async (plainPassword, hashedPassword) => {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
};

const generateToken = async (payload, expTime) => {
  const token = JWT.sign(payload, config.jwtSecret, { expiresIn: expTime });
  return `Bearer ${token}`;
};

const toBoolean = (value) => {
  return true ? value == 'true' : false;
};

module.exports = {
  registerUser,
  obtainAccessToken,
  refreshAccessToken,
  createDefaultTables,
  createSuperUser
};

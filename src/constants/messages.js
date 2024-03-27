module.exports = {
  successMessage: {
    SUCCESS: 'Success',
    ROW_INSERTED: 'Row Inserted',
    PASSWORD_UPDATE_SUCCESS: 'Password updated successfully',
    USER_UPDATE_SUCCESS: 'User updated successfully',
    INITIAL_USER_CREATED_SUCCESS: 'Initial user created successfully',
    LOGOUT_MESSAGE: 'Logout successful',
  },

  errorMessage: {
    USERNAME_TAKEN_ERROR: 'This username is taken',
    WEAK_PASSWORD_ERROR: 'This password is weak, please use another password',
    DEFAULT_ROLE_NOT_CREATED_ERROR:
      'Please restart soul so a default role can be created',
    INVALID_USERNAME_PASSWORD_ERROR: 'Invalid username or password',
    INVALID_REFRESH_TOKEN_ERROR: 'Invalid refresh token',
    INVALID_ACCESS_TOKEN_ERROR: 'Invalid access token',
    USER_NOT_FOUND_ERROR: 'User not found',
    INVALID_CURRENT_PASSWORD_ERROR: 'Invalid current password',
    NOT_AUTHORIZED_ERROR: 'Not authorized',
    PERMISSION_NOT_DEFINED_ERROR: 'Permission not defined for this role',
    ROLE_NOT_FOUND_ERROR: 'Role not found for this user',
    AUTH_SET_TO_FALSE_ERROR:
      'You can not access this endpoint while AUTH is set to false',
    RESERVED_TABLE_NAME_ERROR:
      'The table name is reserved. Please choose a different name for the table.',
    SERVER_ERROR: 'Server error',

    INITIAL_USER_USERNAME_NOT_PASSED_ERROR:
      'Error: You should pass the initial users username either from the CLI with the --iuu or from the environment variable using the INITIAL_USER_USERNAME flag',
    INITIAL_USER_PASSWORD_NOT_PASSED_ERROR:
      'Error: You should pass the initial users password either from the CLI with the --iup or from the environment variable using the INITIAL_USER_PASSWORD flag',

    USERNAME_REQUIRED_ERROR: 'username is required',
    PASSWORD_REQUIRED_ERROR: 'password is required',
  },

  infoMessage: {
    INITIAL_USER_ALREADY_CREATED: 'Initial user is already created',
  },
};

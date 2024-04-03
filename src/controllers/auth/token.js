const { authService } = require('../../services');
const { responseMessages, authConstants } = require('../../constants');
const config = require('../../config');
const {
  comparePasswords,
  generateToken,
  decodeToken,
  toBoolean,
} = require('../../utils');

const { successMessage, errorMessage } = responseMessages;

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
    const users = authService.getUsersByUsername({ username });

    if (users.length <= 0) {
      return res
        .status(401)
        .send({ message: errorMessage.INVALID_USERNAME_PASSWORD_ERROR });
    }

    // check if the password is valid
    const user = users[0];
    const isMatch = await comparePasswords(password, user.hashed_password);

    if (!isMatch) {
      return res
        .status(401)
        .send({ message: errorMessage.INVALID_USERNAME_PASSWORD_ERROR });
      /*
      #swagger.responses[401] = {
        description: 'Invalid username or password error',
        schema: {
          $ref: '#/definitions/InvalidCredentialErrorResponse'
        }
      }
    */
    }

    let roleIds;

    // if the user is not a superuser get the role and its permission from the DB
    if (!toBoolean(user.is_superuser)) {
      const roleData = getUsersRoleAndPermission({
        userId: user.id,
        res,
      });

      roleIds = roleData.roleIds;
    }

    const payload = {
      username: user.username,
      userId: user.id,
      isSuperuser: user.is_superuser,
      roleIds,
    };

    // generate an access token
    const accessToken = await generateToken(
      { subject: authConstants.ACCESS_TOKEN_SUBJECT, ...payload },
      config.tokenSecret,
      config.accessTokenExpirationTime,
    );

    // generate a refresh token
    const refreshToken = await generateToken(
      { subject: authConstants.REFRESH_TOKEN_SUBJECT, ...payload },
      config.tokenSecret,
      config.refreshTokenExpirationTime,
    );

    // set the token in the cookie
    let cookieOptions = { httpOnly: true, secure: false, Path: '/' };
    res.cookie(authConstants.ACCESS_TOKEN_SUBJECT, accessToken, cookieOptions);
    res.cookie(
      authConstants.REFRESH_TOKEN_SUBJECT,
      refreshToken,
      cookieOptions,
    );

    res
      .status(201)
      .send({ message: successMessage.SUCCESS, data: { userId: user.id } });

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
      message: errorMessage.SERVER_ERROR,
    });
  }
};

const refreshAccessToken = async (req, res) => {
  /* 	
    #swagger.tags = ['Auth']
    #swagger.summary = 'Refresh Access Token' 
    #swagger.description = 'Endpoint to refresh access and refresh tokens'
  */
  const refToken = req.cookies.refreshToken;

  try {
    // check if the refresh token is revoked
    if (isRefreshTokenRevoked({ refreshToken: refToken })) {
      return res
        .status(403)
        .send({ message: errorMessage.INVALID_REFRESH_TOKEN_ERROR });
    }

    // extract the payload from the token and verify it
    const payload = await decodeToken(refToken, config.tokenSecret);

    // find the user
    const users = authService.getUsersById({ userId: payload.userId });

    if (users.length <= 0) {
      return res
        .status(401)
        .send({ message: errorMessage.USER_NOT_FOUND_ERROR });

      /*
      #swagger.responses[401] = {
        description: 'User not found error',
        schema: {
          $ref: '#/definitions/UserNotFoundErrorResponse'
        }
      }
    */
    }

    let roleIds;
    const user = users[0];

    // if the user is not a superuser get the role and its permission from the DB
    if (!toBoolean(user.is_superuser)) {
      const roleData = getUsersRoleAndPermission({
        userId: user.id,
        res,
      });

      roleIds = roleData.roleIds;
    }

    const newPayload = {
      username: user.username,
      userId: user.id,
      isSuperuser: user.is_superuser,
      roleIds,
    };

    // generate an access token
    const accessToken = await generateToken(
      { subject: authConstants.ACCESS_TOKEN_SUBJECT, ...newPayload },
      config.tokenSecret,
      config.accessTokenExpirationTime,
    );

    // generate a refresh token
    const refreshToken = await generateToken(
      { subject: authConstants.REFRESH_TOKEN_SUBJECT, ...newPayload },
      config.tokenSecret,
      config.refreshTokenExpirationTime,
    );

    // set the token in the cookie
    let cookieOptions = { httpOnly: true, secure: false, Path: '/' };
    res.cookie(authConstants.ACCESS_TOKEN_SUBJECT, accessToken, cookieOptions);
    res.cookie(
      authConstants.REFRESH_TOKEN_SUBJECT,
      refreshToken,
      cookieOptions,
    );

    res
      .status(200)
      .send({ message: successMessage.SUCCESS, data: { userId: user.id } });

    /*
      #swagger.responses[200] = {
        description: 'Access token refreshed',
        schema: {
          $ref: '#/definitions/RefreshAccessTokenSuccessResponse'
        }
      }
    */
  } catch (error) {
    res.status(403).send({ message: errorMessage.INVALID_REFRESH_TOKEN_ERROR });
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

const removeTokens = async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Remove Tokens'
    #swagger.description = 'Endpoint to remove access and refresh tokens'
  */

  const refreshToken = req.cookies.refreshToken;

  try {
    // decode the token
    const payload = await decodeToken(refreshToken, config.tokenSecret);

    // store the refresh token in the _revoked_refresh_tokens table
    authService.saveRevokedRefreshToken({
      refreshToken,
      expiresAt: payload.exp,
    });

    // remove the token from the cookie
    res.clearCookie(authConstants.ACCESS_TOKEN_SUBJECT);
    res.clearCookie(authConstants.REFRESH_TOKEN_SUBJECT);

    res
      .status(200)
      .send({ message: responseMessages.successMessage.LOGOUT_MESSAGE });

    /*
      #swagger.responses[200] = {
        description: 'Tokens Removed',
        schema: {
          $ref: '#/definitions/RemoveTokensResponse'
        }
      }
    */
  } catch (error) {
    res.status(500).send({ message: errorMessage.SERVER_ERROR });
  }
};

const removeRevokedRefreshTokens = () => {
  authService.deleteRevokedRefreshTokens({
    lookupField: `WHERE expires_at < CURRENT_TIMESTAMP`,
  });

  setTimeout(
    removeRevokedRefreshTokens,
    authConstants.REVOKED_REFRESH_TOKENS_REMOVAL_TIME_RANGE,
  );
};

const getUsersRoleAndPermission = ({ userId, res }) => {
  const userRoles = authService.getUserRoleByUserId({ userId });

  if (userRoles <= 0) {
    res.status(401).send({ message: errorMessage.ROLE_NOT_FOUND_ERROR });
    throw new Error(errorMessage.ROLE_NOT_FOUND_ERROR);
  }

  const roleIds = userRoles.map((role) => role.role_id);

  // get the permission of the role
  const permissions = authService.getPermissionByRoleIds({ roleIds });

  return { userRoles, roleIds, permissions };
};

const isRefreshTokenRevoked = ({ refreshToken }) => {
  const tokens = authService.getRevokedRefreshToken({ refreshToken });
  return tokens.length > 0;
};

module.exports = {
  obtainAccessToken,
  refreshAccessToken,
  removeTokens,
  removeRevokedRefreshTokens,
};

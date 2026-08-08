const crypto = require('crypto');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { passwordStrength } = require('check-password-strength');

const hashPassword = async (password, saltRounds) => {
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return { hashedPassword, salt };
};

// Synchronous variant for one-shot startup/CLI code paths (initial user
// creation, `updatesuperuser`) that are invoked without being awaited by
// their callers — using the async API there would race the process
// continuing (and, in tests, the app being considered ready) against the
// hash actually completing on bcrypt's thread pool.
const hashPasswordSync = (password, saltRounds) => {
  const salt = bcrypt.genSaltSync(saltRounds);
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return { hashedPassword, salt };
};

const comparePasswords = async (plainPassword, hashedPassword) => {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
};

const checkPasswordStrength = (password) => {
  const value = passwordStrength(password).value;
  return value;
};

const generateToken = async (payload, secret, expiresIn) => {
  // jsonwebtoken's HS256 signing is deterministic for identical
  // header+payload+secret -- `iat` only has second precision, so two
  // logins for the same user within the same second (same username,
  // userId, isSuperuser, roleIds, and thus same iat/exp) produce
  // byte-identical access/refresh tokens. Since revocation
  // (_revoked_refresh_tokens) is a plain string match, that collision lets
  // logging out one session silently revoke a completely unrelated
  // concurrent session for the same user. `jwtid` guarantees uniqueness
  // regardless of timing.
  return jwt.sign(payload, secret, { expiresIn, jwtid: crypto.randomUUID() });
};

const decodeToken = async (token, secret) => {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token', { cause: error });
  }
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lowerCaseValue = value.toLowerCase();
    if (lowerCaseValue === 'true') {
      return true;
    } else if (lowerCaseValue === 'false') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    } else if (value === 0) {
      return false;
    }
  }

  throw new Error('Invalid value. Cannot convert to boolean.');
};

const removeFields = async (rows, fields) => {
  const newPayload = rows.map((row) => {
    fields.map((field) => {
      delete row[field];
    });
  });

  return newPayload;
};

module.exports = {
  hashPassword,
  hashPasswordSync,
  comparePasswords,
  checkPasswordStrength,
  generateToken,
  decodeToken,
  toBoolean,
  removeFields,
};

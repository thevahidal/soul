const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { passwordStrength } = require('check-password-strength');

const hashPassword = async (password, saltRounds) => {
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, saltRounds);
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
  return jwt.sign(payload, secret, { expiresIn });
};

const decodeToken = async (token, secret) => {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
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

module.exports = {
  hashPassword,
  comparePasswords,
  checkPasswordStrength,
  generateToken,
  decodeToken,
  toBoolean,
};

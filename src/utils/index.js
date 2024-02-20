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

module.exports = {
  hashPassword,
  comparePasswords,
  checkPasswordStrength,
  generateToken,
  decodeToken,
};

const bcrypt = require('bcrypt');
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

module.exports = { hashPassword, comparePasswords, checkPasswordStrength };

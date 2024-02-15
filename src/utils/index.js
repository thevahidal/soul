const bcrypt = require('bcrypt');

const hashPassword = async (password, saltRounds) => {
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return { hashedPassword, salt };
};

const comparePasswords = async (plainPassword, hashedPassword) => {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
};

module.exports = { hashPassword, comparePasswords };

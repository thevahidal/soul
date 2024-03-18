const users = require('./user');
const token = require('./token');
const tables = require('./tables');

module.exports = { ...users, ...token, ...tables };

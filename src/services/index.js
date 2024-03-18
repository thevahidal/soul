const db = require('../db');

const rowService = require('./rowService')(db);
const tableService = require('./tableService')(db);
const authService = require('./authService')(db);

module.exports = { rowService, tableService, authService };

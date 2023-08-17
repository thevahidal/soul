const db = require('../db');

const rowService = require('./rowService')(db);
const tableService = require('./tableService')(db);

module.exports = { rowService, tableService };

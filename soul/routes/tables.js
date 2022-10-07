const express = require('express');

const controllers = require('../controllers/tables');

const router = express.Router();

router.get('/', controllers.listTables);
router.post('/', controllers.createTable);
router.delete('/', controllers.deleteTable);

module.exports = router;

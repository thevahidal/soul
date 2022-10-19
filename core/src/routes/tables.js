const express = require('express');

const controllers = require('../controllers/tables');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/tables');

const router = express.Router();

router.get('/', validator(schema.listTables), controllers.listTables);
router.post('/', validator(schema.createTable), controllers.createTable);
router.get('/:name', controllers.getTableSchema);
router.delete('/:name', validator(schema.deleteTable), controllers.deleteTable);

module.exports = router;

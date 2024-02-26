const express = require('express');

const controllers = require('../controllers/tables');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/tables');
const { isAuthorized } = require('../middlewares/auth');

const router = express.Router();

router.get(
  '/',
  isAuthorized,
  validator(schema.listTables),
  controllers.listTables,
);
router.post(
  '/',
  isAuthorized,
  validator(schema.createTable),
  controllers.createTable,
);
router.get(
  '/:name',
  isAuthorized,
  validator(schema.getTableSchema),
  controllers.getTableSchema,
);
router.delete(
  '/:name',
  isAuthorized,
  validator(schema.deleteTable),
  controllers.deleteTable,
);

module.exports = router;

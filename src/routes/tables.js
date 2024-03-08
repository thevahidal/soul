const express = require('express');

const controllers = require('../controllers/tables');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/tables');
const { isAuthenticated } = require('../middlewares/auth');

const router = express.Router();

router.get(
  '/',
  isAuthenticated,
  validator(schema.listTables),
  controllers.listTables,
);

router.post(
  '/',
  isAuthenticated,
  validator(schema.createTable),
  controllers.createTable,
);

router.get(
  '/:name',
  isAuthenticated,
  validator(schema.getTableSchema),
  controllers.getTableSchema,
);

router.delete(
  '/:name',
  isAuthenticated,
  validator(schema.deleteTable),
  controllers.deleteTable,
);

module.exports = router;

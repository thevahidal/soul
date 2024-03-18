const express = require('express');

const controllers = require('../controllers/tables');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/tables');
const { hasAccess } = require('../middlewares/auth');
const { processTableRequest } = require('../middlewares/api');

const router = express.Router();

router.get(
  '/',
  hasAccess,
  validator(schema.listTables),
  controllers.listTables,
);

router.post(
  '/',
  processTableRequest,
  hasAccess,
  validator(schema.createTable),
  controllers.createTable,
);

router.get(
  '/:name',
  hasAccess,
  validator(schema.getTableSchema),
  controllers.getTableSchema,
);

router.delete(
  '/:name',
  hasAccess,
  validator(schema.deleteTable),
  controllers.deleteTable,
);

module.exports = router;

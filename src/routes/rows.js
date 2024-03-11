const express = require('express');

const controllers = require('../controllers/rows');
const { broadcast } = require('../middlewares/broadcast');
const { validator } = require('../middlewares/validation');
const { processRowRequest, processRowResponse } = require('../middlewares/api');
const { isAuthenticated } = require('../middlewares/auth');
const schema = require('../schemas/rows');

const router = express.Router();

router.get(
  '/:name/rows',
  isAuthenticated,
  validator(schema.listTableRows),
  processRowRequest,
  controllers.listTableRows,
  processRowResponse,
);
router.post(
  '/:name/rows',
  isAuthenticated,
  validator(schema.insertRowInTable),
  processRowRequest,
  controllers.insertRowInTable,
  broadcast,
);
router.get(
  '/:name/rows/:pks',
  isAuthenticated,
  validator(schema.getRowInTableByPK),
  controllers.getRowInTableByPK,
  processRowResponse,
);
router.put(
  '/:name/rows/:pks',
  isAuthenticated,
  validator(schema.updateRowInTableByPK),
  processRowRequest,
  controllers.updateRowInTableByPK,
  broadcast,
);
router.delete(
  '/:name/rows/:pks',
  isAuthenticated,
  validator(schema.deleteRowInTableByPK),
  controllers.deleteRowInTableByPK,
  broadcast,
);

module.exports = router;

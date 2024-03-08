const express = require('express');

const controllers = require('../controllers/rows');
const { broadcast } = require('../middlewares/broadcast');
const { validator } = require('../middlewares/validation');
const { processRequest, processResponse } = require('../middlewares/api');
const { isAuthenticated } = require('../middlewares/auth');
const schema = require('../schemas/rows');

const router = express.Router();

router.get(
  '/:name/rows',
  isAuthenticated,
  validator(schema.listTableRows),
  processRequest,
  controllers.listTableRows,
  processResponse,
);
router.post(
  '/:name/rows',
  isAuthenticated,
  validator(schema.insertRowInTable),
  processRequest,
  controllers.insertRowInTable,
  broadcast,
);
router.get(
  '/:name/rows/:pks',
  isAuthenticated,
  validator(schema.getRowInTableByPK),
  controllers.getRowInTableByPK,
  processResponse,
);
router.put(
  '/:name/rows/:pks',
  isAuthenticated,
  validator(schema.updateRowInTableByPK),
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

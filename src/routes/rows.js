const express = require('express');

const controllers = require('../controllers/rows');
const { broadcast } = require('../middlewares/broadcast');
const { validator } = require('../middlewares/validation');
const { processRequest, processResponse } = require('../middlewares/api');
const schema = require('../schemas/rows');

const router = express.Router();

router.get(
  '/:name/rows',
  validator(schema.listTableRows),
  processRequest,
  controllers.listTableRows,
  processResponse,
);
router.post(
  '/:name/rows',
  validator(schema.insertRowInTable),
  processRequest,
  controllers.insertRowInTable,
  broadcast,
);
router.get(
  '/:name/rows/:pks',
  validator(schema.getRowInTableByPK),
  controllers.getRowInTableByPK,
  processResponse,
);
router.put(
  '/:name/rows/:pks',
  validator(schema.updateRowInTableByPK),
  controllers.updateRowInTableByPK,
  broadcast,
);
router.delete(
  '/:name/rows/:pks',
  validator(schema.deleteRowInTableByPK),
  controllers.deleteRowInTableByPK,
  broadcast,
);

module.exports = router;

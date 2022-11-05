const express = require('express');

const controllers = require('../controllers/rows');
const { broadcast } = require('../middlewares/broadcast');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/rows');

const router = express.Router();

router.get(
  '/:name/rows',
  validator(schema.listTableRows),
  controllers.listTableRows
);
router.post(
  '/:name/rows',
  validator(schema.insertRowInTable),
  controllers.insertRowInTable,
  broadcast
);
router.get(
  '/:name/rows/:pks',
  validator(schema.getRowInTableByPK),
  controllers.getRowInTableByPK
);
router.put(
  '/:name/rows/:pks',
  validator(schema.updateRowInTableByPK),
  controllers.updateRowInTableByPK,
  broadcast
);
router.delete(
  '/:name/rows/:pks',
  validator(schema.deleteRowInTableByPK),
  controllers.deleteRowInTableByPK,
  broadcast
);

module.exports = router;

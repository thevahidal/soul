const express = require('express');

const controllers = require('../controllers/rows');
const { broadcast } = require('../middlewares/broadcast');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/rows');
const { authorize } = require('../middlewares/authorization');

const router = express.Router();

router.get(
  '/:name/rows',
  authorize,
  validator(schema.listTableRows),
  controllers.listTableRows
);
router.post(
  '/:name/rows',
  authorize,
  validator(schema.insertRowInTable),
  controllers.insertRowInTable,
  broadcast
);
router.get(
  '/:name/rows/:pks',
  authorize,
  validator(schema.getRowInTableByPK),
  controllers.getRowInTableByPK
);
router.put(
  '/:name/rows/:pks',
  authorize,
  validator(schema.updateRowInTableByPK),
  controllers.updateRowInTableByPK,
  broadcast
);
router.delete(
  '/:name/rows/:pks',
  authorize,
  validator(schema.deleteRowInTableByPK),
  controllers.deleteRowInTableByPK,
  broadcast
);

module.exports = router;

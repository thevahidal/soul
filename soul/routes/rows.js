const express = require('express');

const controllers = require('../controllers/rows');
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
  controllers.insertRowInTable
);
router.get(
  '/:name/rows/:pk',
  validator(schema.getRowInTableByPK),
  controllers.getRowInTableByPK
);
router.put(
  '/:name/rows/:pk',
  validator(schema.updateRowInTableByPK),
  controllers.updateRowInTableByPK
);
router.delete(
  '/:name/rows/:pk',
  validator(schema.deleteRowInTableByPK),
  controllers.deleteRowInTableByPK
);

module.exports = router;

const express = require('express');

const controllers = require('../controllers/index');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/index');

const router = express.Router();

router.get('/', controllers.root);
router.post(
  '/transaction',
  validator(schema.transaction),
  controllers.transaction
);

module.exports = router;

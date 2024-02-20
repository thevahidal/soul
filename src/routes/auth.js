const express = require('express');

const controllers = require('../controllers/auth');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/auth');
const router = express.Router();

router.post(
  '/token/obtain',
  validator(schema.obtainAccessToken),
  controllers.obtainAccessToken,
);

module.exports = router;

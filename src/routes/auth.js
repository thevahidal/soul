const express = require('express');

const controllers = require('../controllers/auth');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/auth');
const { authorize } = require('../middlewares/authorization');

const router = express.Router();

router.post(
  '/_users',
  authorize,
  validator(schema.registerUser),
  controllers.registerUser
);

router.post(
  '/token',
  validator(schema.obtainAccessToken),
  controllers.obtainAccessToken
);

module.exports = router;

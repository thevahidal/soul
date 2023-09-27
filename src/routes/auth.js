const express = require('express');

const controllers = require('../controllers/auth');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/auth');

const router = express.Router();

router.post(
  '/users/register',
  validator(schema.registerUser),
  controllers.registerUser
);

router.post(
  '/token',
  validator(schema.obtainAccessToken),
  controllers.obtainAccessToken
);

module.exports = router;

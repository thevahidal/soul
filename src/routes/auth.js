const express = require('express');

const controllers = require('../controllers/auth');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/auth');
const { isAuthenticated } = require('../middlewares/auth');

const router = express.Router();

router.post(
  '/token/obtain',
  validator(schema.obtainAccessToken),
  controllers.obtainAccessToken,
);

router.get(
  '/token/refresh',
  validator(schema.refreshAccessToken),
  controllers.refreshAccessToken,
);

router.put(
  '/change-password',
  validator(schema.changePassword),
  isAuthenticated,
  controllers.changePassword,
);

module.exports = router;

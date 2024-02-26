const express = require('express');

const controllers = require('../controllers/auth');
const { validator } = require('../middlewares/validation');
const schema = require('../schemas/auth');
const { isAuthorized } = require('../middlewares/auth');

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
  '/:userId/change-password',
  validator(schema.changePassword),
  isAuthorized,
  controllers.changePassword,
);

module.exports = router;

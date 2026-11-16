const express = require('express');

const controllers = require('../controllers/batch');
const { validator } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');
const schema = require('../schemas/batch');

const router = express.Router();

router.post('/batch', authenticate, validator(schema.batch), controllers.batch);

module.exports = router;

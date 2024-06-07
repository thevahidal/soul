const express = require('express');

const controllers = require('../controllers/index');

const router = express.Router();

router.get('/', controllers.root);
router.get('/health', controllers.health);

module.exports = router;

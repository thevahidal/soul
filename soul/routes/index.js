const express = require('express');

const controllers = require('../controllers/index');

const router = express.Router();

router.get('/', controllers.root);
router.post('/query', controllers.query);

module.exports = router;

const express = require('express');

const controllers = require('../controllers/rows');

const router = express.Router();

router.get('/:name/rows', controllers.listTableRows);
router.post('/:name/rows', controllers.insertRowInTable);
router.get('/:name/rows/:id', controllers.getRowInTableByPK);
router.put('/:name/rows/:id', controllers.updateRowInTableByPK);
router.delete('/:name/rows/:id', controllers.deleteRowInTableByPK);

module.exports = router;

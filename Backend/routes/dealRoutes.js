const express = require('express');
const router = express.Router();
const { getActiveDeals, getDealById } = require('../controllers/dealController');

router.get('/active', getActiveDeals);
router.get('/:id', getDealById);

module.exports = router;

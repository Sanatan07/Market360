const express = require('express');
const router = express.Router();
const { goToDeal } = require('../controllers/redirectController');

router.get('/go/:dealId', goToDeal);

module.exports = router;

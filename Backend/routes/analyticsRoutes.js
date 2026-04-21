const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { getAffiliateOverview } = require('../controllers/analyticsController');

router.get('/affiliate/overview', auth, isAdmin, getAffiliateOverview);

module.exports = router;

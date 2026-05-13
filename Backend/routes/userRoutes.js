const express = require('express');
const router = express.Router();
const { updateProfile } = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');

router.put('/:userId', auth, writeLimiter, updateProfile);

module.exports = router;

// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, signin, signout, me } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { issueCsrfToken } = require('../middleware/csrf');
const { authLimiter } = require('../middleware/rateLimiters');

router.get('/csrf', issueCsrfToken);
router.get('/me', auth, me);
router.post('/signup', authLimiter, signup);
router.post('/signin', authLimiter, signin);
router.post('/signout', signout);

module.exports = router;


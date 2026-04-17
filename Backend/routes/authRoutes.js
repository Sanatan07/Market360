// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, signin, signout, me } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { issueCsrfToken } = require('../middleware/csrf');

router.get('/csrf', issueCsrfToken);
router.post('/signup', authLimiter, signup);
router.post('/signin', authLimiter, signin);
router.post('/signout', signout);
router.get('/me', auth, me);

module.exports = router;


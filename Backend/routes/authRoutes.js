// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, signin, signout } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/signout', auth, signout);

module.exports = router;


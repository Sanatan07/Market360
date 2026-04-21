const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { writeLimiter } = require('../middleware/rateLimiters');
const { ingestProducts } = require('../controllers/ingestionController');

router.post('/:source/products', writeLimiter, auth, isAdmin, (req, res, next) => {
  req.body.source = req.params.source;
  return ingestProducts(req, res, next);
});

module.exports = router;

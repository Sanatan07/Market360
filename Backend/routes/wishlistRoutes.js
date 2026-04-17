const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { writeLimiter } = require('../middleware/rateLimiters');

// Get Wishlist
router.get('/', wishlistController.getWishlist);

// Add to Wishlist
router.post('/add', writeLimiter, wishlistController.addToWishlist);

// Remove from Wishlist
router.delete('/:productId', writeLimiter, wishlistController.removeFromWishlist);

module.exports = router;

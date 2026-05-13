const express = require('express');
const router = express.Router();
const { getProductsApproved, getProducts, getProductById, updateProductStatus, deleteProduct, toggleLikeDislike, incrementViews, getProductsByUser, updateProduct, getProductPriceHistory } = require('../controllers/productController');
const { auth} = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiters');
const isAdmin = require('../middleware/isAdmin');


// Define routes
router.get('/pending', getProducts);
router.get('/approved', getProductsApproved);
router.get('/userProducts/:createdBy', getProductsByUser);
router.get('/:id/price-history', getProductPriceHistory);
router.get('/:id', getProductById);
router.put('/:id/:action', writeLimiter, auth, toggleLikeDislike);
router.put('/:id/update/:action', writeLimiter, auth, updateProductStatus);  // API for updating status
router.delete('/:id', writeLimiter, auth, deleteProduct);
router.patch('/:id/view', incrementViews);
router.put('/:id', writeLimiter, auth, updateProduct);

module.exports = router;

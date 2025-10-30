// const multer = require('multer');
// const express = require('express');
// const router = express.Router();
// const { createProduct, getProducts, getProductById, toggleLikeDislike } = require('../controllers/productController');
// const auth = require('../middleware/auth');

// // Multer configuration for handling image uploads
// const storage = multer.memoryStorage();  // This stores files in memory
// const upload = multer({ storage: storage }).array('images[]');  // Accept an array of files under 'images[]'

// // Define the routes
// router.post('/', auth, upload, createProduct);  // Add upload as middleware here
// router.get('/', getProducts);
// router.get('/:id', getProductById);
// router.put('/:id/:action', auth, toggleLikeDislike);

// module.exports = router;



const multer = require('multer');
const express = require('express');
const router = express.Router();
const { createProduct, getProductsApproved, getProducts,  getProductById, updateProductStatus, deleteProduct, toggleLikeDislike, incrementViews, getProductsByUser, updateProduct } = require('../controllers/productController');
const { auth} = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
// Multer configuration for handling image uploads (storage in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array('images');  // The field name 'images[]' should match the frontend field name


// Define routes
router.post('/', auth, upload, createProduct);  // Add upload as middleware here
router.get('/pending', getProducts);
router.get('/approved', getProductsApproved);
router.get('/:id', getProductById);
router.put('/:id/:action', auth, toggleLikeDislike);
router.put('/:id/update/:action', auth, updateProductStatus);  // API for updating status
router.delete('/:id', auth, deleteProduct);
router.patch('/:id/view', incrementViews);
router.get('/userProducts/:createdBy', getProductsByUser);
router.put('/:id', updateProduct);

module.exports = router;

const User = require('../models/User');
const Product = require('../models/Product');

// Get Wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist'); // Populating the product data based on product IDs
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user.wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add to Wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // Assuming user is authenticated and `req.user.id` is available
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const productId = req.body.productId;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Avoid duplicate products in wishlist
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
      res.status(200).json({ message: 'Product added to wishlist' });
    } else {
      res.status(400).json({ message: 'Product is already in wishlist' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const productId = req.params.productId;
    const index = user.wishlist.indexOf(productId);

    if (index !== -1) {
      user.wishlist.splice(index, 1);
      await user.save();
      res.status(200).json({ message: 'Product removed from wishlist' });
    } else {
      res.status(404).json({ message: 'Product not found in wishlist' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

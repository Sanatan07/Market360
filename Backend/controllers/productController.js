const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;
const { uploadImage } = require('./cloudinary');
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
const userActions = new Map();

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const productController = {
  // Create a new product with image upload
  // createProduct: async (req, res) => {
  //   try {
  //     const {
  //       dealUrl, title, salePrice, listPrice, description, category, store
  //     } = req.body;

  //     const productData = {
  //       dealUrl,
  //       title,
  //       salePrice,
  //       listPrice,
  //       description,
  //       category,
  //       store,
  //       createdBy: req.user._id,
  //     };

  //     // Handle image uploads
  //     const images = req.files?.length > 0 ? await Promise.all(req.files.map(uploadImage)) : [];
  //     productData.images = images;

  //     const product = new Product(productData);
  //     await product.save();

  //     res.status(201).json(product);
  //   } catch (error) {
  //     res.status(500).json({ message: 'Error creating product', error: error.message });
  //   }
  // },

  createProduct: async (req, res) => {
    try {
        console.log(req.files);  // Log files received from Multer
        console.log(req.body);   // Log the rest of the form data

        const { dealUrl, title, salePrice, listPrice, description, category, store } = req.body;
        const images = req.files;

        const productData = {
            dealUrl,
            title,
            salePrice,
            listPrice,
            description,
            category,
            store,
            createdBy: req.user._id,  // Assuming you have user info in the request
            images: [],
        };

        // Handle image uploads if any images were received
        if (images && images.length > 0) {
            // Upload each image and retrieve its URL and public ID
            const uploadedImages = await Promise.all(images.map(file => uploadImage(file)));  
            
            // Assuming uploadImage returns an object with the image URL and public ID
            productData.images = uploadedImages.map(image => ({
                url: image.url,         // URL of the uploaded image
                public_id: image.public_id,  // Public ID for the image (if using a service like Cloudinary)
            }));
        }

        // Create and save the product to the database
        const product = new Product(productData);
        await product.save();

        res.status(201).json(product);  // Respond with the newly created product
    } catch (error) {
        console.error(error);  // Log any error
        res.status(500).json({
            message: 'Error creating product',
            error: error.message,
        });
    }
},

getProducts: async (req, res) => {
  try {
    const { min, max, categories, search, status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'pending'; // Default to pending if not provided
    }

    if (min && max) {
      query.salePrice = { $gte: parseFloat(min), $lte: parseFloat(max) };
    }

    if (categories) {
      const categoryList = Array.isArray(categories) ? categories : categories.split(',');
      query.category = { $in: categoryList };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const products = await Product.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .lean();

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
},

// productController.js

  // Get all products with filtering
  getProductsApproved: async (req, res) => {
    try {
        console.log('Received Query Params:', req.query);

        const { min, max, categories } = req.query;
        const query = {};
        if (!req.user?.isAdmin) {
          query.status = 'approved';
        }
        // Price filtering
        if (min !== undefined || max !== undefined) {
            query.salePrice = {};
            if (min !== undefined) query.salePrice.$gte = parseFloat(min);
            if (max !== undefined) query.salePrice.$lte = parseFloat(max);
        }
        if (req.query.createdBy) {
          query.createdBy = mongoose.Types.ObjectId(req.query.createdBy);
          }
        // Category filtering
        if (categories) {
            const categoryList = Array.isArray(categories) 
                ? categories 
                : [categories];
            query.category = { $in: categoryList };
        }

        console.log('Final MongoDB Query:', query);

        const products = await Product.find(query)
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });

        console.log('Found Products:', products.length);

        const productsWithCounts = products.map(product => ({
            ...product.toObject(),
            likeCount: product.likeCount || 0,
            dislikeCount: product.dislikeCount || 0
        }));

        res.json(productsWithCounts);
    } catch (error) {
        console.error('Error Details:', error);
        res.status(500).json({ 
            message: 'Error fetching products', 
            error: error.message 
        });
    }
},

getProductsByUser : async (req, res) => {
  try {
    const { createdBy } = req.params;  // Get createdBy from route params
    const { min, max, categories, status, search } = req.query;

    if (!createdBy) {
      return res.status(400).json({ message: 'createdBy is required' });
    }

    const query = {
      status: 'approved',
      createdBy: createdBy,  // Filter by createdBy ID
    };

    // Price filtering
    if (min !== undefined || max !== undefined) {
      query.salePrice = {};
      if (min !== undefined) query.salePrice.$gte = parseFloat(min);
      if (max !== undefined) query.salePrice.$lte = parseFloat(max);
    }

    // Category filtering
    if (categories) {
      const categoryList = Array.isArray(categories) 
        ? categories 
        : [categories];
      query.category = { $in: categoryList };
    }

    // Status filtering (if needed)
    if (status) {
      query.status = status;
    }

    // Search filtering (if needed)
    if (search) {
      query.title = { $regex: search, $options: 'i' };  // Case-insensitive search
    }

    console.log('Final MongoDB Query:', query);

    // Fetch the products based on the createdBy ID and other filters
    const products = await Product.find(query)
      .populate('createdBy', 'username')  // Populate the username of the creator
      .sort({ createdAt: -1 });

    console.log('Found Products:', products.length);

    const productsWithCounts = products.map(product => ({
      ...product.toObject(),
      likeCount: product.likeCount || 0,
      dislikeCount: product.dislikeCount || 0
    }));

    res.json(productsWithCounts);
  } catch (error) {
    console.error('Error Details:', error);
    res.status(500).json({
      message: 'Error fetching products',
      error: error.message
    });
  }
},


  // Get a single product by ID
  getProductById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('createdBy', 'username')
        .lean();
      
      if (!product) return res.status(404).json({ message: 'Product not found' });

      res.json(product);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  updateProductStatus : async (req, res) => {
    const { id, action } = req.params;
  
    try {
      // Validate action
      if (action !== 'approved' && action !== 'rejected') {
        return res.status(400).json({ message: 'Invalid action. Status must be "approved" or "rejected".' });
      }
  
      // Find the product by ID
      const product = await Product.findById(id);
  
      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }
  
      // Update the status
      product.status = action;
  
      // If status is rejected, delete the product
      if (product.status === 'rejected') {
        await product.deleteOne({ _id: id });
        return res.status(200).json({ message: 'Product has been rejected and deleted successfully.' });
      }
  
      // Save updated product
      await product.save();
  
      res.status(200).json({ message: 'Product status updated successfully.', product });
  
    } catch (error) {
      console.error('Error updating product status:', error);
      res.status(500).json({ message: 'Error updating product status.', error: error.message });
    }
  },

  deleteProduct : async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
  
      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }
  
      // Check if the status is 'rejected' before deletion
      if (product.status === 'rejected') {
        await product.remove();
        return res.status(200).json({ message: 'Product deleted successfully.' });
      } else {
        return res.status(400).json({ message: 'Product status is not "rejected". Deletion is not allowed.' });
      }
  
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Error deleting product.', error: error.message });
    }
  },

  toggleLikeDislike: async (req, res) => {
    const { action } = req.params; // 'like' or 'dislike'
    const userId = req.user._id.toString();
    const productId = req.params.id;
    const userKey = `${userId}:${productId}`;

    try {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const previousAction = userActions.get(userKey);

      if (action === 'like') {
        if (previousAction === 'like') {
          // If already liked, undo the like
          product.likeCount -= 1;
          userActions.delete(userKey);
        } else {
          // If previously disliked, remove dislike first
          if (previousAction === 'dislike') {
            product.dislikeCount -= 1;
          }
          product.likeCount += 1;
          userActions.set(userKey, 'like');
        }
      } else if (action === 'dislike') {
        if (previousAction === 'dislike') {
          // If already disliked, undo the dislike
          product.dislikeCount -= 1;
          userActions.delete(userKey);
        } else {
          // If previously liked, remove like first
          if (previousAction === 'like') {
            product.likeCount -= 1;
          }
          product.dislikeCount += 1;
          userActions.set(userKey, 'dislike');
        }
      } else {
        return res.status(400).json({ message: "Invalid action. Use 'like' or 'dislike'." });
      }

      await product.save();
      res.json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating like/dislike status', error: error.message });
    }
  },

  // Update product information
  updateProduct: async (req, res) => {
    try {
      const allowedUpdates = ['dealUrl', 'title', 'salePrice', 'listPrice', 'description', 'category', 'store', 'images'];
      const product = await Product.findById(req.params.id);

      if (!product) return res.status(404).json({ message: 'Product not found' });

      // if (!req.user.isAdmin && product.createdBy.toString() !== req.user._id.toString()) {
      //   return res.status(403).json({ message: 'You are not authorized to edit this product' });
      // }

      const productUpdates = {};
      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          productUpdates[key] = req.body[key];
        }
      }

      // Handle image updates
      if (req.files && req.files.length > 0) {
        // Remove existing images
        if (product.images.length > 0) {
          await Promise.all(product.images.map(async (image) => {
            try {
              await cloudinary.uploader.destroy(image.public_id);
            } catch (err) {
              console.error('Error deleting image:', err);
            }
          }));
        }

        productUpdates.images = await Promise.all(req.files.map(uploadImage));
      }

      Object.assign(product, productUpdates);
      await product.save();

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Error updating product', error: error.message });
    }
  },


  incrementViews: async (req, res) => {
    console.log('Increment Views Called for Product:', req.params.id);
    console.log('Product Model:', Product); // Ensure Product is defined
  
    try {
      const productId = req.params.id;
      const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { viewCount: 1 } },
        { new: true }
      );
  
      if (!product) return res.status(404).json({ message: 'Product not found' });
  
      res.json(product);
    } catch (error) {
      console.error('Error incrementing view count:', error);
      res.status(500).json({ message: 'Error incrementing view count', error: error.message });
    }
  },

  // Delete product
  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) return res.status(404).json({ message: 'Product not found' });
      //commented the below code because only users who created this can delete
      // if (product.createdBy.toString() !== req.user._id.toString()) {
      //   return res.status(403).json({ message: 'You are not authorized to delete this product' });
      // }

      // Delete uploaded images
      if (product.images.length > 0) {
        await Promise.all(product.images.map(async (image) => {
          try {
            await cloudinary.uploader.destroy(image.public_id);
          } catch (err) {
            console.error('Error deleting image:', err);
          }
        }));
      }

      await product.deleteOne();
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
  },
};



module.exports = productController;
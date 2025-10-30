// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();
async function initializeAdminUser() {
  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'adminpassword';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminUser = new User({
        email: adminEmail,
        username: 'admin',
        password: adminPassword,
        isAdmin: true
      });
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Import the authentication middleware
const { auth } = require('./middleware/auth');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/wishlist', auth, require('./routes/wishlistRoutes'));


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
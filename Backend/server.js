// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { auth } = require('./middleware/auth');
const { requireCsrf } = require('./middleware/csrf');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

if (process.env.NODE_ENV === 'production') {
  // Required for Secure cookies behind Render/other proxies
  app.set('trust proxy', 1);
}

app.use(helmet());

const parseOrigins = () => {
  const raw = process.env.FRONTEND_ORIGINS || process.env.CLIENT_URL || '';
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  // Safe defaults for local development only
  return ['http://localhost:3000', 'http://localhost:5173'];
};

const allowedOrigins = parseOrigins();

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(requireCsrf);

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('Backend is running');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/wishlist', auth, require('./routes/wishlistRoutes'));

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (e.g. CORS)
app.use((err, req, res, next) => {
  if (err && String(err.message).includes('CORS')) {
    return res.status(403).json({ message: 'CORS blocked for this origin' });
  }
  next(err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

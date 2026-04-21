// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { auth } = require('./middleware/auth');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { requireCsrf, CSRF_HEADER_NAME } = require('./middleware/csrf');
const { startScheduler } = require('./services/scheduler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

if (process.env.NODE_ENV === 'production') {
  // Required when running behind Render/NGINX proxies for secure cookies
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cookieParser());

const parseAllowedOrigins = () => {
  const raw = process.env.FRONTEND_ORIGINS || process.env.CLIENT_URL || '';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl/postman) without an Origin header
      if (!origin) return callback(null, true);

      const local = ['http://localhost:3000', 'http://localhost:5173'];
      const allowed = [...local, ...allowedOrigins];
      if (allowed.includes(origin)) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', CSRF_HEADER_NAME],
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(requireCsrf);
app.use('/', require('./routes/seoRoutes'));

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('Backend is running');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/deals', require('./routes/dealRoutes'));
app.use('/api/ingest', require('./routes/ingestionRoutes'));
app.use('/api/redirect', require('./routes/redirectRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/admin-ops', require('./routes/adminOpsRoutes'));
app.use('/api/wishlist', auth, require('./routes/wishlistRoutes'));
app.use('/go', require('./routes/redirectRoutes'));

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler();
});

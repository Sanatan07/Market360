const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_COOKIE_NAME = 'access_token';

const getTokenFromRequest = (req) => {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  return token || null;
};

const isExpired = (decoded) => {
  if (!decoded || typeof decoded !== 'object') return true;
  if (!decoded.exp) return false; // tokens without exp are allowed but discouraged
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp <= now;
};

// Middleware for required authentication
exports.auth = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (isExpired(decoded)) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error();
    }

    req.user = user; // Attach the user to the request object
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware for optional authentication (does not require a valid token)
exports.optionalAuth = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (isExpired(decoded)) return next();
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user; // Attach the user if token is valid
      }
    } catch (error) {
      // Ignore any errors and proceed
    }
  }

  next();
};

// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' || isProduction;
  const sameSite = process.env.COOKIE_SAMESITE || (isProduction ? 'none' : 'lax');

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
};

const issueAccessToken = (userId) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
};

const authController = {
  signup: async (req, res) => {
    try {
      const { email, password, confirmPassword, username } = req.body;

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      const userExists = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const user = new User({ email, password, username });
      await user.save();

      const token = issueAccessToken(user._id);
      res.cookie('access_token', token, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({ user: { id: user._id, email: user.email, username: user.username } });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user' });
    }
  },

  signin: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = issueAccessToken(user._id);
      res.cookie('access_token', token, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: { id: user._id, email: user.email, username: user.username } });
    } catch (error) {
      res.status(500).json({ message: 'Error signing in' });
    }
  },

  signout: async (req, res) => {
    try {
      res.clearCookie('access_token', getCookieOptions());
      res.json({ message: 'Successfully signed out' });
    } catch (error) {
      res.status(500).json({ message: 'Error signing out' });
    }
  },

  me: async (req, res) => {
    const user = req.user;
    res.json({ user: { id: user._id, email: user.email, username: user.username, isAdmin: user.isAdmin } });
  }
};

module.exports = authController;

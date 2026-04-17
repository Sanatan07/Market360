// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const ACCESS_COOKIE_NAME = 'access_token';

const jwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

const setAuthCookie = (res, token) => {
  const { authCookieOptions } = require('../utils/cookies');
  res.cookie(ACCESS_COOKIE_NAME, token, {
    ...authCookieOptions(),
    // Keep cookie lifetime aligned with JWT lifetime. If expiresIn is not a number,
    // cookie becomes a session cookie (still OK); JWT will enforce expiry.
  });
};

const clearAuthCookie = (res) => {
  const { authCookieOptions } = require('../utils/cookies');
  res.clearCookie(ACCESS_COOKIE_NAME, authCookieOptions());
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

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn() });
      setAuthCookie(res, token);

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

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn() });
      setAuthCookie(res, token);

      res.json({ user: { id: user._id, email: user.email, username: user.username } });
    } catch (error) {
      res.status(500).json({ message: 'Error signing in' });
    }
  },

  signout: async (req, res) => {
    try {
      clearAuthCookie(res);
      res.json({ message: 'Successfully signed out' });
    } catch (error) {
      res.status(500).json({ message: 'Error signing out' });
    }
  },

  me: async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    res.json({ user: { id: user._id, email: user.email, username: user.username, isAdmin: !!user.isAdmin } });
  },
};

module.exports = authController;

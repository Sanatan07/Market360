// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      res.status(201).json({ token, user: { id: user._id, email: user.email, username: user.username } });
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

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
    } catch (error) {
      res.status(500).json({ message: 'Error signing in' });
    }
  },

  signout: async (req, res) => {
    try {
      req.user = null;
      req.token = null;
      res.json({ message: 'Successfully signed out' });
    } catch (error) {
      res.status(500).json({ message: 'Error signing out' });
    }
  }
};

module.exports = authController;
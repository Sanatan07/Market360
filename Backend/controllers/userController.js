const User = require('../models/User');
const bcrypt = require('bcryptjs');

const userController = {
  updateProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      const { fullName, email, gender, country, currentPassword, newPassword } = req.body;

      // Ensure the user is updating their own profile (or is admin)
      if (req.user._id.toString() !== userId && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this profile' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Handle password update if provided
      if (currentPassword && newPassword) {
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({ message: 'Incorrect current password' });
        }
        user.password = newPassword;
      }

      // Update other fields
      if (fullName !== undefined) user.fullName = fullName;
      if (email !== undefined) user.email = email;
      if (gender !== undefined) user.gender = gender;
      if (country !== undefined) user.country = country;

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          gender: user.gender,
          country: user.country,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
  }
};

module.exports = userController;

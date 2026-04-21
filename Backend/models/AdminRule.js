const mongoose = require('mongoose');

const adminRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['brand-blacklist', 'product-blacklist', 'category-override'],
    required: true,
    index: true
  },
  value: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  replacementValue: {
    type: String,
    trim: true
  },
  reason: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

adminRuleSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('AdminRule', adminRuleSchema, 'admin_rules');

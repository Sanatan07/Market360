const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  category: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  source: {
    type: String,
    enum: ['flipkart', 'manual']
  },
  targetPrice: Number,
  discountThreshold: {
    type: Number,
    default: 40,
    min: 1,
    max: 95
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastTriggeredAt: Date,
  lastMatchedProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }
}, { timestamps: true });

priceAlertSchema.index({ userId: 1, productId: 1, category: 1 });

module.exports = mongoose.model('PriceAlert', priceAlertSchema, 'price_alerts');

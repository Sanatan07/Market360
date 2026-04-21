const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  capturedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  currentPrice: { type: Number, required: true },
  originalPrice: Number,
  discountPercent: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true }
});

priceHistorySchema.index({ productId: 1, capturedAt: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema, 'price_histories');

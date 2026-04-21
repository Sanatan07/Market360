const mongoose = require('mongoose');

const clickEventSchema = new mongoose.Schema({
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  source: { type: String, enum: ['manual', 'amazon', 'flipkart'], index: true },
  ipHash: String,
  userAgent: String,
  referrer: String,
  clickedAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('ClickEvent', clickEventSchema, 'click_events');

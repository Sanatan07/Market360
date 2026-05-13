const mongoose = require('mongoose');

const clickEventSchema = new mongoose.Schema({
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  source: { type: String, enum: ['manual', 'flipkart'], index: true },
  category: { type: String, index: true },
  store: { type: String, index: true },
  placement: { type: String, default: 'unknown', index: true },
  section: { type: String, default: 'unknown', index: true },
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'bot', 'unknown'], default: 'unknown', index: true },
  browser: String,
  os: String,
  ipHash: String,
  userAgent: String,
  referrer: String,
  landingPath: String,
  sessionId: String,
  converted: { type: Boolean, default: false, index: true },
  estimatedCommission: { type: Number, default: 0 },
  clickedAt: { type: Date, default: Date.now, index: true }
});

clickEventSchema.index({ source: 1, clickedAt: -1 });
clickEventSchema.index({ category: 1, clickedAt: -1 });
clickEventSchema.index({ dealId: 1, clickedAt: -1 });
clickEventSchema.index({ section: 1, placement: 1, clickedAt: -1 });

module.exports = mongoose.model('ClickEvent', clickEventSchema, 'click_events');

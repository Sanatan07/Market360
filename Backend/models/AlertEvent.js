const mongoose = require('mongoose');

const alertEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'PriceAlert', index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  channel: { type: String, enum: ['in-app', 'email', 'telegram', 'whatsapp', 'push'], default: 'in-app', index: true },
  type: { type: String, enum: ['price-drop', 'discount-threshold', 'daily-best-deals'], required: true, index: true },
  title: String,
  message: String,
  status: { type: String, enum: ['pending', 'sent', 'failed', 'read'], default: 'pending', index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  sentAt: Date,
  readAt: Date
}, { timestamps: true });

module.exports = mongoose.model('AlertEvent', alertEventSchema, 'alert_events');

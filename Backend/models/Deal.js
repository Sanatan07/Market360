const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  source: {
    type: String,
    enum: ['manual', 'flipkart'],
    required: true,
    index: true
  },
  dealType: {
    type: String,
    enum: ['discount', 'lightning', 'coupon', 'price-drop', 'manual'],
    default: 'discount',
    index: true
  },
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  startsAt: Date,
  endsAt: Date,
  currentPrice: { type: Number, required: true },
  previousPrice: Number,
  originalPrice: Number,
  discountPercent: { type: Number, default: 0, index: true },
  dealScore: { type: Number, min: 0, max: 100, default: 0, index: true },
  affiliateUrl: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'expired', 'hidden'],
    default: 'active',
    index: true
  },
  rankingSignals: {
    discountWeight: { type: Number, default: 0 },
    ratingWeight: { type: Number, default: 0 },
    reviewVolumeWeight: { type: Number, default: 0 },
    commissionWeight: { type: Number, default: 0 },
    clickTrendWeight: { type: Number, default: 0 },
    freshnessWeight: { type: Number, default: 0 }
  },
  qualification: {
    isQualified: { type: Boolean, default: false, index: true },
    reasons: [{ type: String, trim: true }],
    hiddenReasons: [{ type: String, trim: true }]
  },
  clickCount: { type: Number, default: 0 },
  lastClickedAt: Date
}, { timestamps: true });

dealSchema.index({ status: 1, dealScore: -1, detectedAt: -1 });
dealSchema.index({ 'qualification.isQualified': 1, status: 1, dealScore: -1 });

dealSchema.pre('validate', function(next) {
  if (!this.discountPercent && this.originalPrice && this.currentPrice) {
    this.discountPercent = Math.round(((this.originalPrice - this.currentPrice) / this.originalPrice) * 100);
  }
  if (!this.dealScore) {
    const discount = this.discountPercent || 0;
    const rating = this.rankingSignals?.ratingWeight || 0;
    const popularity = this.rankingSignals?.reviewVolumeWeight || 0;
    const commission = this.rankingSignals?.commissionWeight || 0;
    this.dealScore = Math.max(0, Math.min(100, Math.round(discount * 0.65 + rating + popularity + commission)));
  }
  next();
});

module.exports = mongoose.model('Deal', dealSchema, 'deals');

const mongoose = require('mongoose');

const sourceEnum = ['manual', 'amazon', 'flipkart'];

const productSchema = new mongoose.Schema({

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    required: true
  },
  
  dealUrl: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    enum: sourceEnum,
    default: 'manual',
    index: true
  },
  sourceProductId: {
    type: String,
    trim: true,
    sparse: true
  },
  affiliateUrl: {
    type: String,
    trim: true
  },
  canonicalSourceUrl: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  salePrice: {
    type: Number,
    required: true
  },
  listPrice: {
    type: Number,
    required: true
  },
  discountPercent: {
    type: Number,
    min: 0,
    default: 0,
    index: true
  },
  currency: {
    type: String,
    default: 'INR',
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  images: [
    {
      url: { type: String, required: true },
      public_id: { type: String },
      source: { type: String, enum: ['manual', 'api', 'feed'], default: 'manual' }
    }
  ],  // This is changed to an array of image objects

  description: {
    type: String,
    required: true
  },
  descriptionShort: {
    type: String,
    trim: true
  },
  features: [{ type: String, trim: true }],
  tags: [{ type: String, trim: true, lowercase: true }],
  category: {
    type: String,
    required: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  store: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    min: 0,
    default: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },
  dealScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    index: true
  },
  isTrending: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  lastSyncedAt: Date,
  priceVerifiedAt: Date,
  contentExpiresAt: Date,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isQualifiedDeal: {
    type: Boolean,
    default: false,
    index: true
  },
  qualificationReasons: [{ type: String, trim: true }],
  hiddenReasons: [{ type: String, trim: true }],
  complianceFlags: {
    priceFromApi: { type: Boolean, default: false },
    needsRefresh: { type: Boolean, default: false },
    disclaimerRequired: { type: Boolean, default: false }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  likeCount: {
    type: Number,
    default: 0
  },
  dislikeCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  viewCount: {  // Added this field
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0,
    index: true
  },
  lastClickedAt: {
    type: Date
  }
}, { timestamps: true });

productSchema.index({ source: 1, sourceProductId: 1 }, { unique: true, sparse: true });
productSchema.index({ category: 1, isActive: 1, discountPercent: -1 });
productSchema.index({ lastSyncedAt: -1 });
productSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });

productSchema.virtual('currentPrice').get(function() {
  return this.salePrice;
});

productSchema.virtual('originalPrice').get(function() {
  return this.listPrice;
});

productSchema.pre('validate', function(next) {
  if (!this.affiliateUrl && this.dealUrl) this.affiliateUrl = this.dealUrl;
  if (!this.dealUrl && this.affiliateUrl) this.dealUrl = this.affiliateUrl;
  if (!this.descriptionShort && this.description) {
    this.descriptionShort = this.description.slice(0, 220);
  }
  if (this.salePrice && this.listPrice) {
    this.discountPercent = Math.max(0, Math.round(((this.listPrice - this.salePrice) / this.listPrice) * 100));
    if (!this.dealScore) {
      this.dealScore = Math.min(100, this.discountPercent);
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema, 'products');

const { normalizeProduct } = require('../normalization/productNormalizer');

const mapFlipkartItem = (item) => normalizeProduct({
  source: 'flipkart',
  sourceProductId: item.productId || item.id,
  title: item.title,
  brand: item.brand,
  category: item.categoryPath || item.category,
  images: item.imageUrls || item.images || [],
  currentPrice: item.currentPrice || item.sellingPrice,
  originalPrice: item.originalPrice || item.mrp,
  currency: item.currency || 'INR',
  rating: item.rating,
  reviewCount: item.reviewCount,
  inStock: item.inStock,
  affiliateUrl: item.affiliateUrl || item.productUrl,
  canonicalSourceUrl: item.productUrl,
  description: item.description,
  features: item.features,
  tags: item.tags,
  store: 'Flipkart'
});

module.exports = {
  mapFlipkartItem
};

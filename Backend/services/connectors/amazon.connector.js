const { normalizeProduct } = require('../normalization/productNormalizer');

const mapAmazonItem = (item) => normalizeProduct({
  source: 'amazon',
  sourceProductId: item.asin || item.ASIN,
  title: item.title || item.ItemInfo?.Title?.DisplayValue,
  brand: item.brand || item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
  category: item.category,
  images: item.images || [],
  currentPrice: item.currentPrice,
  originalPrice: item.originalPrice,
  currency: item.currency || 'INR',
  rating: item.rating,
  reviewCount: item.reviewCount,
  inStock: item.inStock,
  affiliateUrl: item.affiliateUrl,
  canonicalSourceUrl: item.canonicalSourceUrl,
  description: item.description,
  features: item.features,
  tags: item.tags,
  store: 'Amazon'
});

module.exports = {
  mapAmazonItem
};

const STORE_BY_SOURCE = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  manual: 'Market360'
};

const normalizeCategory = (value = '') => {
  const category = String(value).toLowerCase();
  if (category.includes('electronic') || category.includes('mobile') || category.includes('computer')) return 'Electronics';
  if (category.includes('fashion') || category.includes('clothing') || category.includes('shoe')) return 'Fashion';
  if (category.includes('home') || category.includes('kitchen')) return 'Home & Garden';
  if (category.includes('beauty') || category.includes('personal')) return 'Beauty';
  if (category.includes('sport')) return 'Sports & Outdoors';
  if (category.includes('book')) return 'Books';
  if (category.includes('toy') || category.includes('game')) return 'Toys & Games';
  if (category.includes('auto')) return 'Automotive';
  return value || 'Other';
};

const calculateDiscountPercent = (currentPrice, originalPrice) => {
  if (!currentPrice || !originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
};

const normalizeProduct = (sourceProduct) => {
  const source = sourceProduct.source || 'manual';
  const currentPrice = Number(sourceProduct.currentPrice ?? sourceProduct.salePrice ?? 0);
  const originalPrice = Number(sourceProduct.originalPrice ?? sourceProduct.listPrice ?? currentPrice);
  const discountPercent = calculateDiscountPercent(currentPrice, originalPrice);
  const affiliateUrl = sourceProduct.affiliateUrl || sourceProduct.dealUrl;

  return {
    source,
    sourceProductId: sourceProduct.sourceProductId,
    title: sourceProduct.title,
    slug: sourceProduct.slug,
    brand: sourceProduct.brand,
    category: normalizeCategory(sourceProduct.category),
    subcategory: sourceProduct.subcategory,
    images: (sourceProduct.images || []).map((image) => (
      typeof image === 'string'
        ? { url: image, source: source === 'manual' ? 'manual' : 'api' }
        : image
    )),
    salePrice: currentPrice,
    listPrice: originalPrice,
    discountPercent,
    currency: sourceProduct.currency || 'INR',
    rating: sourceProduct.rating,
    reviewCount: sourceProduct.reviewCount || 0,
    inStock: sourceProduct.inStock !== false,
    dealUrl: affiliateUrl,
    affiliateUrl,
    canonicalSourceUrl: sourceProduct.canonicalSourceUrl,
    description: sourceProduct.description || sourceProduct.descriptionShort || sourceProduct.title,
    descriptionShort: sourceProduct.descriptionShort,
    features: sourceProduct.features || [],
    tags: sourceProduct.tags || [],
    store: sourceProduct.store || STORE_BY_SOURCE[source] || source,
    lastSyncedAt: new Date(),
    priceVerifiedAt: new Date(),
    contentExpiresAt: source === 'amazon' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
    complianceFlags: {
      priceFromApi: source !== 'manual',
      needsRefresh: false,
      disclaimerRequired: source === 'amazon'
    },
    dealScore: Math.min(100, Math.max(0, discountPercent))
  };
};

module.exports = {
  calculateDiscountPercent,
  normalizeProduct
};

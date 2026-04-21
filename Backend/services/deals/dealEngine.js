const Deal = require('../../models/Deal');
const PriceHistory = require('../../models/PriceHistory');
const { calculateDiscountPercent } = require('../normalization/productNormalizer');

const scoreDeal = ({ discountPercent = 0, rating = 0, reviewCount = 0, commissionWeight = 0 }) => {
  const ratingWeight = rating ? Math.min(12, rating * 2.4) : 0;
  const popularityWeight = Math.min(12, Math.log10((reviewCount || 0) + 1) * 4);
  return Math.max(0, Math.min(100, Math.round(discountPercent * 0.7 + ratingWeight + popularityWeight + commissionWeight)));
};

const recordPriceSnapshot = async (product) => {
  const discountPercent = calculateDiscountPercent(product.salePrice, product.listPrice);
  return PriceHistory.create({
    productId: product._id,
    currentPrice: product.salePrice,
    originalPrice: product.listPrice,
    discountPercent,
    inStock: product.inStock
  });
};

const upsertActiveDealForProduct = async (product, options = {}) => {
  const discountPercent = calculateDiscountPercent(product.salePrice, product.listPrice);
  const dealScore = scoreDeal({
    discountPercent,
    rating: product.rating,
    reviewCount: product.reviewCount,
    commissionWeight: options.commissionWeight || 0
  });

  const deal = await Deal.findOneAndUpdate(
    { productId: product._id, status: 'active' },
    {
      productId: product._id,
      source: product.source || 'manual',
      dealType: options.dealType || 'discount',
      currentPrice: product.salePrice,
      previousPrice: options.previousPrice,
      originalPrice: product.listPrice,
      discountPercent,
      dealScore,
      affiliateUrl: product.affiliateUrl || product.dealUrl,
      rankingSignals: {
        ratingWeight: product.rating ? Math.min(12, product.rating * 2.4) : 0,
        popularityWeight: Math.min(12, Math.log10((product.reviewCount || 0) + 1) * 4),
        discountWeight: discountPercent,
        commissionWeight: options.commissionWeight || 0
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  product.dealScore = dealScore;
  await product.save();
  await recordPriceSnapshot(product);
  return deal;
};

module.exports = {
  recordPriceSnapshot,
  scoreDeal,
  upsertActiveDealForProduct
};

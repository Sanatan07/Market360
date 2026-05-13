const Deal = require('../../models/Deal');
const PriceHistory = require('../../models/PriceHistory');
const { calculateDiscountPercent, cleanupTitle } = require('../normalization/productNormalizer');

const DEFAULT_RULES = {
  minimumDiscountPercent: 20,
  minimumPrice: 99,
  minimumReviewCount: 5,
  minimumRating: 3.2,
  maximumDiscountPercent: 90,
  maximumOriginalToCurrentRatio: 8,
  maximumStaleHoursBySource: {
    flipkart: 48,
    manual: 168
  },
  allowedCategories: [
    'electronics',
    'mobiles-accessories',
    'computers',
    'audio',
    'kitchen-appliances',
    'home-living',
    'fashion',
    'beauty-personal-care',
    'toys-books',
    'fitness-sports',
    'automotive'
  ]
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const normalizeRatingScore = (rating) => {
  if (!rating) return 0;
  return clamp((Number(rating) / 5) * 100);
};

const normalizeReviewVolume = (reviewCount = 0) => {
  if (!reviewCount) return 0;
  return clamp((Math.log10(Number(reviewCount) + 1) / 4) * 100);
};

const estimateCommissionPotential = (product, explicitWeight) => {
  if (explicitWeight !== undefined) return clamp(explicitWeight);

  const category = product.category;
  const source = product.source;
  if (source === 'flipkart') {
    if (category === 'fashion') return 85;
    if (category === 'toys-books' || category === 'home-living') return 55;
    if (category === 'mobiles-accessories') return 20;
    return 40;
  }
  return 25;
};

const normalizeClickTrend = (clickCount = 0) => clamp((Math.log10(Number(clickCount) + 1) / 3) * 100);

const getFreshnessScore = (product) => {
  const reference = product.priceVerifiedAt || product.lastSyncedAt || product.updatedAt || product.createdAt;
  if (!reference) return 0;

  const ageHours = (Date.now() - new Date(reference).getTime()) / (60 * 60 * 1000);
  const maxHours = DEFAULT_RULES.maximumStaleHoursBySource[product.source] || 48;
  return clamp(100 - (ageHours / maxHours) * 100);
};

const hasAcceptableTitle = (title) => {
  const cleaned = cleanupTitle(title || '');
  if (cleaned.length < 12 || cleaned.length > 180) return false;
  if (/^(test|dummy|sample|untitled)$/i.test(cleaned)) return false;
  if ((cleaned.match(/[a-z0-9]/gi) || []).length < 8) return false;
  return true;
};

const hasValidAffiliateUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
};

const isStale = (product) => {
  if (product.contentExpiresAt && new Date(product.contentExpiresAt).getTime() < Date.now()) return true;
  const reference = product.priceVerifiedAt || product.lastSyncedAt;
  if (!reference) return true;
  const ageHours = (Date.now() - new Date(reference).getTime()) / (60 * 60 * 1000);
  const maxHours = DEFAULT_RULES.maximumStaleHoursBySource[product.source] || 48;
  return ageHours > maxHours;
};

const isSuspiciousOriginalPrice = (product, discountPercent) => {
  if (!product.salePrice || !product.listPrice) return true;
  const ratio = product.listPrice / product.salePrice;
  return discountPercent > DEFAULT_RULES.maximumDiscountPercent || ratio > DEFAULT_RULES.maximumOriginalToCurrentRatio;
};

const detectDuplicateProduct = async (product) => {
  if (!product?._id) return false;
  const title = cleanupTitle(product.title || '').toLowerCase();
  const primaryImage = product.images?.[0]?.url;

  const duplicate = await product.constructor.exists({
    _id: { $ne: product._id },
    source: product.source,
    $or: [
      { sourceProductId: product.sourceProductId },
      ...(title ? [{ title: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
      ...(primaryImage ? [{ 'images.url': primaryImage }] : [])
    ]
  });

  return Boolean(duplicate);
};

const qualifyProductForDeal = async (product, options = {}) => {
  const rules = { ...DEFAULT_RULES, ...(options.rules || {}) };
  const discountPercent = calculateDiscountPercent(product.salePrice, product.listPrice);
  const reasons = [];
  const hiddenReasons = [];

  if (discountPercent >= rules.minimumDiscountPercent) reasons.push('discount-threshold-met');
  else hiddenReasons.push('discount-below-threshold');

  if (product.salePrice > rules.minimumPrice) reasons.push('price-floor-met');
  else hiddenReasons.push('price-below-floor');

  if (product.inStock === true) reasons.push('in-stock');
  else hiddenReasons.push('out-of-stock');

  if (hasAcceptableTitle(product.title)) reasons.push('title-quality-ok');
  else hiddenReasons.push('poor-title-quality');

  if (rules.allowedCategories.includes(product.category)) reasons.push('category-allowed');
  else hiddenReasons.push('category-not-allowed');

  if (product.images?.length > 0) reasons.push('image-present');
  else hiddenReasons.push('missing-image');

  if ((product.reviewCount || 0) >= rules.minimumReviewCount) reasons.push('review-volume-ok');
  else hiddenReasons.push('review-count-too-low');

  if (!product.rating || product.rating >= rules.minimumRating) reasons.push('rating-ok');
  else hiddenReasons.push('poor-rating');

  if (!isSuspiciousOriginalPrice(product, discountPercent)) reasons.push('price-spread-ok');
  else hiddenReasons.push('suspicious-original-price');

  if (!isStale(product)) reasons.push('fresh-data');
  else hiddenReasons.push('stale-data');

  if (hasValidAffiliateUrl(product.affiliateUrl || product.dealUrl)) reasons.push('affiliate-link-ok');
  else hiddenReasons.push('broken-affiliate-link');

  const isDuplicate = options.skipDuplicateCheck ? false : await detectDuplicateProduct(product);
  if (!isDuplicate) reasons.push('not-duplicate');
  else hiddenReasons.push('duplicate-product');

  return {
    isQualified: hiddenReasons.length === 0,
    reasons,
    hiddenReasons,
    discountPercent
  };
};

const scoreDeal = ({
  discountPercent = 0,
  rating = 0,
  reviewCount = 0,
  commissionPotential = 0,
  clickTrend = 0,
  freshnessScore = 0
}) => {
  const signals = {
    discountWeight: clamp(discountPercent) * 0.35,
    ratingWeight: normalizeRatingScore(rating) * 0.20,
    reviewVolumeWeight: normalizeReviewVolume(reviewCount) * 0.15,
    commissionWeight: clamp(commissionPotential) * 0.15,
    clickTrendWeight: clamp(clickTrend) * 0.10,
    freshnessWeight: clamp(freshnessScore) * 0.05
  };

  const total = Object.values(signals).reduce((sum, value) => sum + value, 0);
  return {
    dealScore: Math.round(clamp(total)),
    rankingSignals: signals
  };
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
  const qualification = await qualifyProductForDeal(product, options);
  const existingDeal = await Deal.findOne({ productId: product._id, status: 'active' }).lean();
  const commissionPotential = estimateCommissionPotential(product, options.commissionPotential);
  const clickTrend = options.clickTrend ?? normalizeClickTrend(existingDeal?.clickCount || 0);
  const freshnessScore = getFreshnessScore(product);
  const { dealScore, rankingSignals } = scoreDeal({
    discountPercent: qualification.discountPercent,
    rating: product.rating,
    reviewCount: product.reviewCount,
    commissionPotential,
    clickTrend,
    freshnessScore
  });

  const status = qualification.isQualified ? 'active' : 'hidden';
  const deal = await Deal.findOneAndUpdate(
    { productId: product._id },
    {
      productId: product._id,
      source: product.source || 'manual',
      dealType: options.dealType || 'discount',
      currentPrice: product.salePrice,
      previousPrice: options.previousPrice,
      originalPrice: product.listPrice,
      discountPercent: qualification.discountPercent,
      dealScore,
      affiliateUrl: product.affiliateUrl || product.dealUrl,
      status,
      rankingSignals,
      qualification
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  product.discountPercent = qualification.discountPercent;
  product.dealScore = dealScore;
  product.isQualifiedDeal = qualification.isQualified;
  product.isActive = qualification.isQualified;
  product.qualificationReasons = qualification.reasons;
  product.hiddenReasons = qualification.hiddenReasons;
  await product.save();
  await recordPriceSnapshot(product);
  return deal;
};

module.exports = {
  DEFAULT_RULES,
  qualifyProductForDeal,
  recordPriceSnapshot,
  scoreDeal,
  upsertActiveDealForProduct
};

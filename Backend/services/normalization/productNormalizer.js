const CANONICAL_CATEGORIES = [
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
];

const STORE_BY_SOURCE = {
  flipkart: 'Flipkart',
  manual: 'Market360'
};

const CATEGORY_RULES = [
  { category: 'mobiles-accessories', terms: ['mobile', 'phone', 'smartphone', 'case', 'charger', 'power bank', 'screen guard'] },
  { category: 'computers', terms: ['computer', 'laptop', 'desktop', 'monitor', 'printer', 'keyboard', 'mouse', 'ssd', 'hard disk', 'router'] },
  { category: 'audio', terms: ['audio', 'headphone', 'earphone', 'earbud', 'speaker', 'soundbar', 'microphone'] },
  { category: 'kitchen-appliances', terms: ['kitchen', 'mixer', 'grinder', 'microwave', 'kettle', 'toaster', 'induction', 'cookware'] },
  { category: 'home-living', terms: ['home', 'living', 'furniture', 'decor', 'furnishing', 'mattress', 'bedding', 'storage'] },
  { category: 'fashion', terms: ['fashion', 'clothing', 'apparel', 'shoe', 'footwear', 'shirt', 'dress', 'watch', 'bag', 'wallet'] },
  { category: 'beauty-personal-care', terms: ['beauty', 'personal care', 'grooming', 'skin', 'hair', 'makeup', 'perfume'] },
  { category: 'toys-books', terms: ['toy', 'game', 'book', 'media', 'stationery', 'baby'] },
  { category: 'fitness-sports', terms: ['sport', 'fitness', 'gym', 'cycle', 'outdoor', 'nutrition'] },
  { category: 'automotive', terms: ['auto', 'automotive', 'car', 'bike', 'motorcycle', 'helmet'] },
  { category: 'electronics', terms: ['electronic', 'camera', 'television', 'tv', 'appliance', 'gadget'] }
];

const compact = (values) => values.filter((value) => value !== undefined && value !== null && value !== '');

const cleanText = (value = '') => String(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const cleanupTitle = (value = '') => cleanText(value)
  .replace(/\s+[-|]\s+Flipkart\.com$/i, '');

const generateSlug = (value = '') => cleanupTitle(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

const extractBrandFromTitle = (title = '') => {
  const cleaned = cleanupTitle(title);
  const firstToken = cleaned.split(/\s+/)[0];
  return firstToken && firstToken.length > 1 ? firstToken : undefined;
};

const normalizeBrand = (brand, title) => cleanText(brand) || extractBrandFromTitle(title);

const parsePrice = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'object') {
    return parsePrice(value.amount ?? value.Amount ?? value.value ?? value.Value ?? value.DisplayAmount);
  }
  const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const calculateDiscountPercent = (currentPrice, originalPrice) => {
  if (!currentPrice || !originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
};

const normalizeRating = (rating) => {
  const parsed = parseFloat(String(rating ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed > 5 && parsed <= 10) return Number((parsed / 2).toFixed(1));
  return Math.min(5, Math.max(0, Number(parsed.toFixed(1))));
};

const normalizeReviewCount = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCategory = (value = '') => {
  const text = Array.isArray(value) ? value.join(' ') : String(value);
  const categoryText = text.toLowerCase();
  const exact = CANONICAL_CATEGORIES.find((category) => category === categoryText);
  if (exact) return exact;

  const match = CATEGORY_RULES.find((rule) => rule.terms.some((term) => categoryText.includes(term)));
  return match?.category || 'electronics';
};

const normalizeImages = (images = [], source = 'manual') => {
  const list = Array.isArray(images) ? images : Object.values(images || {}).flatMap((value) => (
    value && typeof value === 'object' && !value.url && !value.URL
      ? Object.values(value)
      : value
  ));
  const seen = new Set();

  return list
    .map((image) => {
      if (!image) return null;
      if (typeof image === 'string') return { url: image, source: source === 'manual' ? 'manual' : 'api' };
      const url = image.url || image.URL || image.large || image.medium || image.small;
      if (!url) return null;
      return {
        url,
        public_id: image.public_id,
        source: image.source || (source === 'manual' ? 'manual' : 'api')
      };
    })
    .filter((image) => {
      if (!image || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
};

const normalizeTags = (values = []) => compact(values)
  .flatMap((value) => String(value).split(','))
  .map((value) => cleanText(value).toLowerCase())
  .filter(Boolean)
  .slice(0, 20);

const normalizeProduct = (sourceProduct) => {
  const source = sourceProduct.source || 'manual';
  const title = cleanupTitle(sourceProduct.title);
  const currentPrice = parsePrice(sourceProduct.currentPrice ?? sourceProduct.salePrice) || 0;
  const originalPrice = parsePrice(sourceProduct.originalPrice ?? sourceProduct.listPrice) || currentPrice;
  const discountPercent = calculateDiscountPercent(currentPrice, originalPrice);
  const affiliateUrl = sourceProduct.affiliateUrl || sourceProduct.dealUrl;
  const features = compact(sourceProduct.features || []).map(cleanText).filter(Boolean);
  const brand = normalizeBrand(sourceProduct.brand, title);
  const category = normalizeCategory(sourceProduct.category);

  return {
    source,
    sourceProductId: sourceProduct.sourceProductId,
    title,
    slug: sourceProduct.slug || generateSlug(`${title}-${sourceProduct.sourceProductId || source}`),
    brand,
    category,
    subcategory: cleanText(sourceProduct.subcategory),
    images: normalizeImages(sourceProduct.images, source),
    salePrice: currentPrice,
    listPrice: originalPrice,
    discountPercent,
    currency: sourceProduct.currency || 'INR',
    rating: normalizeRating(sourceProduct.rating),
    reviewCount: normalizeReviewCount(sourceProduct.reviewCount),
    inStock: sourceProduct.inStock !== false,
    dealUrl: affiliateUrl,
    affiliateUrl,
    canonicalSourceUrl: sourceProduct.canonicalSourceUrl,
    description: cleanText(sourceProduct.description || sourceProduct.descriptionShort || title),
    descriptionShort: cleanText(sourceProduct.descriptionShort || sourceProduct.description || title).slice(0, 220),
    features,
    tags: normalizeTags([...(sourceProduct.tags || []), brand, category]),
    store: sourceProduct.store || STORE_BY_SOURCE[source] || source,
    lastSyncedAt: new Date(),
    priceVerifiedAt: new Date(),
    complianceFlags: {
      priceFromApi: source !== 'manual',
      needsRefresh: false,
    },
    dealScore: Math.min(100, Math.max(0, discountPercent))
  };
};

const getFlipkartBaseInfo = (item) => item.productBaseInfoV1 || item.productBaseInfo || item;

const mapFlipkartToNormalizedProduct = (item) => {
  const base = getFlipkartBaseInfo(item);
  const imageUrls = item.imageUrls || item.images || base.imageUrls || [];

  return normalizeProduct({
    source: 'flipkart',
    sourceProductId: item.productId || item.id || base.productId,
    title: item.title || base.title,
    brand: item.brand || base.productBrand,
    category: item.categoryPath || item.category || base.categoryPath,
    images: imageUrls,
    currentPrice: item.currentPrice || item.sellingPrice || base.flipkartSellingPrice,
    originalPrice: item.originalPrice || item.mrp || base.maximumRetailPrice || base.flipkartSellingPrice,
    currency: item.currency || base.flipkartSellingPrice?.currency || 'INR',
    rating: item.rating || base.productRating,
    reviewCount: item.reviewCount || base.reviewCount,
    inStock: item.inStock ?? base.inStock ?? base.isAvailable,
    affiliateUrl: item.affiliateUrl || item.productUrl || base.productUrl,
    canonicalSourceUrl: item.productUrl || base.productUrl,
    description: item.description || base.productDescription || item.title || base.title,
    features: item.features || base.keySpecs || [],
    tags: item.tags,
    store: 'Flipkart'
  });
};

module.exports = {
  CANONICAL_CATEGORIES,
  calculateDiscountPercent,
  cleanupTitle,
  generateSlug,
  mapFlipkartToNormalizedProduct,
  normalizeBrand,
  normalizeCategory,
  normalizeImages,
  normalizeProduct,
  normalizeRating,
  parsePrice
};

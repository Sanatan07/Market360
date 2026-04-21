const AMAZON_CONTENT_CACHE_MS = 24 * 60 * 60 * 1000;

const applyAmazonCompliance = (normalizedProduct) => ({
  ...normalizedProduct,
  source: 'amazon',
  store: 'Amazon',
  contentExpiresAt: new Date(Date.now() + AMAZON_CONTENT_CACHE_MS),
  complianceFlags: {
    ...normalizedProduct.complianceFlags,
    priceFromApi: true,
    needsRefresh: false,
    disclaimerRequired: true
  },
  images: (normalizedProduct.images || []).map((image) => ({
    ...image,
    source: 'api',
    public_id: undefined
  }))
});

const isAmazonContentStale = (product) => {
  if (!product?.contentExpiresAt) return true;
  return new Date(product.contentExpiresAt).getTime() <= Date.now();
};

module.exports = {
  AMAZON_CONTENT_CACHE_MS,
  applyAmazonCompliance,
  isAmazonContentStale
};

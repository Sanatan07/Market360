const axios = require('axios');
const ConnectorError = require('./connectorError');
const { mapFlipkartToNormalizedProduct } = require('../normalization/productNormalizer');

const API_BASE_URL = process.env.FLIPKART_API_BASE_URL || 'https://affiliate-api.flipkart.net/affiliate';

const getConfig = () => {
  const affiliateId = process.env.FLIPKART_AFFILIATE_ID;
  const affiliateToken = process.env.FLIPKART_AFFILIATE_TOKEN;

  if (!affiliateId || !affiliateToken) {
    throw new ConnectorError('Flipkart connector is missing affiliate credentials.', {
      required: ['FLIPKART_AFFILIATE_ID', 'FLIPKART_AFFILIATE_TOKEN']
    });
  }

  return { affiliateId, affiliateToken };
};

const getHeaders = () => {
  const { affiliateId, affiliateToken } = getConfig();
  return {
    'Fk-Affiliate-Id': affiliateId,
    'Fk-Affiliate-Token': affiliateToken
  };
};

const flipkartGet = async (url, params = {}) => {
  const response = await axios.get(url, {
    headers: getHeaders(),
    params,
    timeout: Number(process.env.FLIPKART_API_TIMEOUT_MS || 12000)
  });
  return response.data;
};

const appendAffiliateId = (url) => {
  if (!url) return url;
  const { affiliateId } = getConfig();
  const parsed = new URL(url);
  if (!parsed.searchParams.has('affid')) {
    parsed.searchParams.set('affid', affiliateId);
  }
  return parsed.toString();
};

const buildAffiliateUrl = (productUrl) => appendAffiliateId(productUrl);

const getBaseInfo = (item) => item.productBaseInfoV1 || item.productBaseInfo || item;

const mapFlipkartItem = (item) => {
  const base = getBaseInfo(item);
  const productUrl = item.productUrl || base.productUrl;
  return mapFlipkartToNormalizedProduct({
    ...item,
    affiliateUrl: item.affiliateUrl || buildAffiliateUrl(productUrl),
    canonicalSourceUrl: productUrl
  });
};

const getCategories = async () => {
  const { affiliateId } = getConfig();
  const data = await flipkartGet(`${API_BASE_URL}/api/${affiliateId}.json`);
  return data.apiGroups?.affiliate?.apiListings || data.apiListings || data;
};

const getCategoryFeed = async (category, options = {}) => {
  const { affiliateId } = getConfig();
  const url = options.url || `${API_BASE_URL}/feeds/${affiliateId}/category/${encodeURIComponent(category)}.json`;
  const data = await flipkartGet(url, options.inStock ? { inStock: true } : {});
  const productList = data.productInfoList || data.products || [];

  return {
    products: productList.map(mapFlipkartItem),
    nextUrl: data.nextUrl,
    version: data.version,
    raw: data
  };
};

const getDeltaFeed = async (category, options = {}) => {
  const { affiliateId } = getConfig();
  const url = options.url || `${API_BASE_URL}/1.0/deltaFeeds/${affiliateId}/category/${encodeURIComponent(category)}.json`;
  const params = {
    ...(options.version ? { version: options.version } : {}),
    ...(options.inStock ? { inStock: true } : {})
  };
  const data = await flipkartGet(url, params);
  const productList = data.productInfoList || data.products || [];

  return {
    products: productList.map(mapFlipkartItem),
    deletedProductIds: productList
      .filter((item) => getBaseInfo(item).isAvailable === false)
      .map((item) => item.productId || getBaseInfo(item).productId)
      .filter(Boolean),
    nextUrl: data.nextUrl,
    version: data.version,
    raw: data
  };
};

module.exports = {
  buildAffiliateUrl,
  getCategories,
  getCategoryFeed,
  getDeltaFeed,
  mapFlipkartToNormalizedProduct,
  mapFlipkartItem
};

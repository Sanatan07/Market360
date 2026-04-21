const axios = require('axios');
const ConnectorError = require('./connectorError');
const { signPaApiRequest } = require('./amazonSigner');
const { applyAmazonCompliance } = require('./amazon.compliance');
const { mapAmazonToNormalizedProduct } = require('../normalization/productNormalizer');

const DEFAULT_RESOURCES = [
  'Images.Primary.Large',
  'ItemInfo.ByLineInfo',
  'ItemInfo.Features',
  'ItemInfo.Title',
  'OffersV2.Listings.Availability',
  'OffersV2.Listings.Price',
  'OffersV2.Summaries.HighestPrice',
  'OffersV2.Summaries.LowestPrice'
];

const getConfig = () => {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_ASSOCIATE_TAG;
  const region = process.env.AMAZON_API_REGION || 'eu-west-1';
  const host = process.env.AMAZON_PAAPI_HOST || 'webservices.amazon.in';
  const marketplace = process.env.AMAZON_MARKETPLACE || 'www.amazon.in';

  if (!accessKey || !secretKey || !partnerTag) {
    throw new ConnectorError('Amazon connector is missing affiliate/API credentials.', {
      required: ['AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY', 'AMAZON_ASSOCIATE_TAG']
    });
  }

  return { accessKey, secretKey, partnerTag, region, host, marketplace };
};

const getAffiliateConfig = () => {
  const partnerTag = process.env.AMAZON_ASSOCIATE_TAG;
  const marketplace = process.env.AMAZON_MARKETPLACE || 'www.amazon.in';
  if (!partnerTag) {
    throw new ConnectorError('Amazon affiliate tag is required to build affiliate URLs.', {
      required: ['AMAZON_ASSOCIATE_TAG']
    });
  }
  return { partnerTag, marketplace };
};

const targetByOperation = {
  searchitems: 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
  getitems: 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems'
};

const paApiRequest = async (operation, payload) => {
  const config = getConfig();
  const path = `/paapi5/${operation}`;
  const target = targetByOperation[operation];
  if (!target) throw new ConnectorError(`Unsupported Amazon PA-API operation: ${operation}`);
  const signed = signPaApiRequest({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
    host: config.host,
    path,
    target,
    payload
  });

  const response = await axios.post(`https://${config.host}${path}`, signed.payloadString, {
    headers: signed.headers,
    timeout: Number(process.env.AMAZON_API_TIMEOUT_MS || 12000)
  });

  return response.data;
};

const buildAffiliateUrl = (asin) => {
  const { partnerTag, marketplace } = getAffiliateConfig();
  if (!asin) throw new ConnectorError('ASIN is required to build an Amazon affiliate URL.');
  return `https://${marketplace}/dp/${encodeURIComponent(asin)}?tag=${encodeURIComponent(partnerTag)}`;
};

const mapAmazonItem = (item) => {
  const asin = item.asin || item.ASIN;
  const normalized = mapAmazonToNormalizedProduct({
    ...item,
    affiliateUrl: item.affiliateUrl || item.DetailPageURL || buildAffiliateUrl(asin),
    canonicalSourceUrl: item.canonicalSourceUrl || (asin ? `https://${process.env.AMAZON_MARKETPLACE || 'www.amazon.in'}/dp/${asin}` : undefined)
  });

  return applyAmazonCompliance(normalized);
};

const searchProductsByCategory = async ({ category, keywords, limit = 10, resources = DEFAULT_RESOURCES }) => {
  const { partnerTag, marketplace } = getConfig();
  const data = await paApiRequest('searchitems', {
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: marketplace,
    SearchIndex: category,
    Keywords: keywords || category,
    ItemCount: Math.min(Number(limit) || 10, 10),
    Resources: resources
  });

  return (data.SearchResult?.Items || []).map(mapAmazonItem);
};

const getProductBatch = async (asins, resources = DEFAULT_RESOURCES) => {
  const { partnerTag, marketplace } = getConfig();
  const itemIds = Array.isArray(asins) ? asins : [asins];
  if (itemIds.length === 0) return [];

  const data = await paApiRequest('getitems', {
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: marketplace,
    ItemIds: itemIds.slice(0, 10),
    Resources: resources
  });

  return (data.ItemsResult?.Items || []).map(mapAmazonItem);
};

const getProductByAsin = async (asin) => {
  const [product] = await getProductBatch([asin]);
  return product || null;
};

const refreshPriceAvailability = async (asin) => {
  const product = await getProductByAsin(asin);
  if (!product) return null;

  return {
    sourceProductId: product.sourceProductId,
    salePrice: product.salePrice,
    listPrice: product.listPrice,
    discountPercent: product.discountPercent,
    inStock: product.inStock,
    priceVerifiedAt: product.priceVerifiedAt,
    contentExpiresAt: product.contentExpiresAt,
    complianceFlags: product.complianceFlags
  };
};

module.exports = {
  buildAffiliateUrl,
  getProductBatch,
  getProductByAsin,
  mapAmazonToNormalizedProduct,
  mapAmazonItem,
  refreshPriceAvailability,
  searchProductsByCategory
};

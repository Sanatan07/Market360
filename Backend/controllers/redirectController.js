const crypto = require('crypto');
const Deal = require('../models/Deal');
const Product = require('../models/Product');
const ClickEvent = require('../models/ClickEvent');

const hashIp = (ip = '') => crypto.createHash('sha256').update(ip).digest('hex');

const getDeviceType = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  if (/bot|crawler|spider|slurp/.test(ua)) return 'bot';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
  if (ua) return 'desktop';
  return 'unknown';
};

const getBrowser = (userAgent = '') => {
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  return 'Unknown';
};

const getOs = (userAgent = '') => {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iphone|ipad|ios/i.test(userAgent)) return 'iOS';
  if (/mac os/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
};

const estimateCommission = (deal, product) => {
  const price = deal.currentPrice || product?.salePrice || 0;
  const category = product?.category;
  const source = deal.source;
  let rate = 0.01;

  if (source === 'flipkart') {
    if (category === 'fashion') rate = 0.06;
    else if (category === 'beauty-personal-care') rate = 0.05;
    else if (category === 'mobiles-accessories') rate = 0.015;
    else rate = 0.025;
  } else if (source === 'amazon') {
    if (category === 'fashion' || category === 'beauty-personal-care') rate = 0.04;
    else if (category === 'electronics' || category === 'mobiles-accessories') rate = 0.01;
    else rate = 0.02;
  }

  return Number((price * rate).toFixed(2));
};

const buildClickMetadata = (req, deal) => {
  const product = deal.productId;
  const userAgent = req.get('user-agent') || '';

  return {
    dealId: deal._id,
    productId: product?._id,
    source: deal.source,
    category: product?.category,
    store: product?.store,
    placement: req.query.placement || req.query.slot || 'unknown',
    section: req.query.section || 'unknown',
    deviceType: getDeviceType(userAgent),
    browser: getBrowser(userAgent),
    os: getOs(userAgent),
    ipHash: hashIp(req.ip),
    userAgent,
    referrer: req.get('referer'),
    landingPath: req.query.from || req.get('referer'),
    sessionId: req.query.sid,
    estimatedCommission: estimateCommission(deal, product)
  };
};

const redirectController = {
  goToDeal: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.dealId).populate('productId');
      if (!deal || deal.status !== 'active' || deal.qualification?.isQualified === false) {
        return res.status(404).json({ message: 'Deal not found or expired.' });
      }

      if (!deal.affiliateUrl) {
        return res.status(410).json({ message: 'Affiliate link is unavailable.' });
      }

      const click = await ClickEvent.create(buildClickMetadata(req, deal));

      deal.clickCount += 1;
      deal.lastClickedAt = click.clickedAt;
      await deal.save();

      if (deal.productId?._id) {
        await Product.findByIdAndUpdate(deal.productId._id, {
          $inc: { clickCount: 1, viewCount: 1 },
          $set: { lastClickedAt: click.clickedAt }
        });
      }

      return res.redirect(302, deal.affiliateUrl);
    } catch (error) {
      return res.status(500).json({ message: 'Error redirecting to deal', error: error.message });
    }
  }
};

module.exports = redirectController;

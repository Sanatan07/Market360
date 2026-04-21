const AlertEvent = require('../../models/AlertEvent');
const Deal = require('../../models/Deal');
const PriceAlert = require('../../models/PriceAlert');
const Product = require('../../models/Product');
const User = require('../../models/User');

const buildProductMessage = (product) => `${product.title} is now ${product.discountPercent}% off at ${product.store}.`;

const findMatchingProductsForAlert = async (alert) => {
  const query = {
    isQualifiedDeal: true,
    isActive: true,
    inStock: true
  };

  if (alert.productId) query._id = alert.productId;
  if (alert.category) query.category = alert.category;
  if (alert.source) query.source = alert.source;
  if (alert.targetPrice) query.salePrice = { $lte: alert.targetPrice };
  if (alert.discountThreshold) query.discountPercent = { $gte: alert.discountThreshold };

  return Product.find(query).sort({ dealScore: -1 }).limit(10);
};

const evaluatePriceAlerts = async () => {
  const alerts = await PriceAlert.find({ isActive: true }).limit(1000);
  const events = [];

  for (const alert of alerts) {
    const products = await findMatchingProductsForAlert(alert);
    for (const product of products) {
      const alreadySent = await AlertEvent.exists({
        userId: alert.userId,
        alertId: alert._id,
        productId: product._id,
        type: alert.productId ? 'price-drop' : 'discount-threshold',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (alreadySent) continue;

      const event = await AlertEvent.create({
        userId: alert.userId,
        alertId: alert._id,
        productId: product._id,
        type: alert.productId ? 'price-drop' : 'discount-threshold',
        title: alert.productId ? 'Price drop alert' : `Deal alert: ${alert.discountThreshold}%+ off`,
        message: buildProductMessage(product),
        status: 'pending',
        metadata: {
          salePrice: product.salePrice,
          listPrice: product.listPrice,
          discountPercent: product.discountPercent
        }
      });

      alert.lastTriggeredAt = new Date();
      alert.lastMatchedProductId = product._id;
      await alert.save();
      events.push(event);
    }
  }

  return events;
};

const generateDailyBestDealAlerts = async () => {
  const users = await User.find({ 'personalization.dailyBestDealsEmail': true });
  const events = [];

  for (const user of users) {
    const categoryQuery = user.savedCategories?.length
      ? { category: { $in: user.savedCategories } }
      : {};
    const sourceQuery = user.personalization?.preferredSources?.length
      ? { source: { $in: user.personalization.preferredSources } }
      : {};

    const deals = await Deal.find({ status: 'active', 'qualification.isQualified': true, ...sourceQuery })
      .populate({
        path: 'productId',
        match: {
          isActive: true,
          ...categoryQuery,
          ...(user.personalization?.maxPrice ? { salePrice: { $lte: user.personalization.maxPrice } } : {})
        }
      })
      .sort({ dealScore: -1 })
      .limit(10)
      .lean();

    const productIds = deals.filter((deal) => deal.productId).map((deal) => deal.productId._id);
    if (!productIds.length) continue;

    events.push(await AlertEvent.create({
      userId: user._id,
      channel: 'email',
      type: 'daily-best-deals',
      title: 'Your daily Market360 deals',
      message: `${productIds.length} personalized deals are ready for you today.`,
      status: 'pending',
      metadata: { productIds }
    }));
  }

  return events;
};

module.exports = {
  evaluatePriceAlerts,
  findMatchingProductsForAlert,
  generateDailyBestDealAlerts
};

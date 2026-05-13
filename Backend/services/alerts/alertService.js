const AlertEvent = require('../../models/AlertEvent');
const Deal = require('../../models/Deal');
const PriceAlert = require('../../models/PriceAlert');
const Product = require('../../models/Product');
const User = require('../../models/User');
const { sendEmail } = require('./mailer');

const buildProductMessage = (product) => `${product.title} is now ${product.discountPercent}% off at ${product.store}.`;

const buildEmailHtml = (title, message, product = null) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #2196f3;">${title}</h2>
      <p>${message}</p>
      ${product ? `
        <div style="display: flex; align-items: center; background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
          ${product.images?.[0] ? `<img src="${product.images[0].url}" style="width: 100px; height: 100px; object-fit: contain; margin-right: 20px;" />` : ''}
          <div>
            <h4 style="margin: 0;">${product.title}</h4>
            <p style="margin: 5px 0;">
              <span style="font-size: 1.2em; font-weight: bold; color: #e60023;">$${product.salePrice}</span>
              <span style="text-decoration: line-through; color: #888; margin-left: 10px;">$${product.listPrice}</span>
              <span style="color: #4caf50; margin-left: 10px;">${product.discountPercent}% OFF</span>
            </p>
            <a href="${frontendUrl}/products/${product._id}" style="display: inline-block; background: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Deal</a>
          </div>
        </div>
      ` : ''}
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 0.8em; color: #888; text-align: center;">
        You received this because you have alerts set up on Market360.
        <br />
        <a href="${frontendUrl}/profile">Manage your preferences</a>
      </p>
    </div>
  `;
};

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

      // Determine if user wants email for this
      const user = await User.findById(alert.userId).select('personalization email');
      const channel = user?.personalization?.dailyBestDealsEmail ? 'email' : 'in-app';

      const event = await AlertEvent.create({
        userId: alert.userId,
        alertId: alert._id,
        productId: product._id,
        channel: channel,
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

const processPendingEmailAlerts = async () => {
  const events = await AlertEvent.find({
    channel: 'email',
    status: 'pending'
  }).populate('userId').populate('productId').limit(50);

  const results = { sent: 0, failed: 0 };

  for (const event of events) {
    try {
      if (!event.userId?.email) {
        event.status = 'failed';
        event.metadata.error = 'User has no email address';
        await event.save();
        results.failed++;
        continue;
      }

      await sendEmail({
        to: event.userId.email,
        subject: event.title,
        text: event.message,
        html: buildEmailHtml(event.title, event.message, event.productId)
      });

      event.status = 'sent';
      event.sentAt = new Date();
      await event.save();
      results.sent++;
    } catch (error) {
      console.error(`Failed to send email for event ${event._id}:`, error);
      event.status = 'failed';
      event.metadata.error = error.message;
      await event.save();
      results.failed++;
    }
  }

  return results;
};

module.exports = {
  evaluatePriceAlerts,
  findMatchingProductsForAlert,
  generateDailyBestDealAlerts,
  processPendingEmailAlerts
};


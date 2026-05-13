const Deal = require('../../models/Deal');
const Product = require('../../models/Product');
const SourceSyncLog = require('../../models/SourceSyncLog');
const { evaluatePriceAlerts, generateDailyBestDealAlerts } = require('../alerts/alertService');
const { flipkart } = require('../connectors');
const { upsertActiveDealForProduct } = require('../deals/dealEngine');

const TARGET_CATEGORIES = (process.env.SYNC_TARGET_CATEGORIES || [
  'electronics',
  'mobiles-accessories',
  'computers',
  'audio',
  'kitchen-appliances',
  'home-living',
  'fashion',
  'beauty-personal-care'
].join(','))
  .split(',')
  .map((category) => category.trim())
  .filter(Boolean);

const SOURCES = (process.env.SYNC_SOURCES || 'flipkart')
  .split(',')
  .map((source) => source.trim())
  .filter(Boolean);

const createLog = (syncType, fields = {}) => SourceSyncLog.create({
  source: fields.source || 'system',
  syncType,
  status: 'running',
  category: fields.category,
  requestedCount: fields.requestedCount || 0,
  metadata: fields.metadata || {}
});

const finishLog = async (log, status, updates = {}) => {
  if (!log) return null;
  return log.finish(status, updates);
};

const upsertNormalizedProducts = async (products, log) => {
  const results = {
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    deals: []
  };

  for (const normalized of products) {
    try {
      if (!normalized.sourceProductId) {
        results.skippedCount += 1;
        continue;
      }

      const existing = await Product.exists({
        source: normalized.source,
        sourceProductId: normalized.sourceProductId
      });

      const product = await Product.findOneAndUpdate(
        { source: normalized.source, sourceProductId: normalized.sourceProductId },
        { $set: normalized },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );

      const deal = await upsertActiveDealForProduct(product);
      results.deals.push(deal._id);
      if (existing) results.updatedCount += 1;
      else results.insertedCount += 1;
    } catch (error) {
      results.failedCount += 1;
      if (log) {
        log.metadata = {
          ...(log.metadata || {}),
          errors: [...(log.metadata?.errors || []), error.message].slice(-20)
        };
      }
    }
  }

  return results;
};

const refreshTopActiveDeals = async (limit = 500) => {
  const log = await createLog('price-refresh', { requestedCount: limit, metadata: { job: 'refreshTopActiveDeals' } });
  try {
    const deals = await Deal.find({ status: 'active', 'qualification.isQualified': true })
      .populate('productId')
      .sort({ dealScore: -1, clickCount: -1 })
      .limit(limit);

    let updatedCount = 0;
    let failedCount = 0;

    for (const deal of deals) {
      try {
        const product = deal.productId;
        if (!product) continue;

        let patch = null;
        if (product.source === 'flipkart') {
          const feed = await flipkart.getDeltaFeed(product.category, { inStock: true });
          patch = feed.products.find((item) => item.sourceProductId === product.sourceProductId);
        }

        if (patch) {
          Object.assign(product, patch);
          await product.save();
          await upsertActiveDealForProduct(product);
          updatedCount += 1;
        }
      } catch (error) {
        failedCount += 1;
      }
    }

    return finishLog(log, failedCount ? 'partial' : 'success', {
      requestedCount: deals.length,
      updatedCount,
      failedCount
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const validateHomepageItems = async () => {
  const log = await createLog('homepage-validation', { metadata: { job: 'validateHomepageItems' } });
  try {
    const products = await Product.find({ isFeatured: true, isActive: true }).limit(100);
    let updatedCount = 0;

    for (const product of products) {
      const deal = await upsertActiveDealForProduct(product);
      if (deal.status === 'active') updatedCount += 1;
    }

    return finishLog(log, 'success', {
      requestedCount: products.length,
      updatedCount
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const expireStaleDeals = async () => {
  const log = await createLog('expire-stale-deals', { metadata: { job: 'expireStaleDeals' } });
  try {
    const now = new Date();
    const staleProducts = await Product.find({
      isActive: true,
      $or: [
        { contentExpiresAt: { $lte: now } },
        { inStock: false }
      ]
    }).select('_id');
    const productIds = staleProducts.map((product) => product._id);

    const result = await Deal.updateMany(
      {
        status: 'active',
        $or: [
          { endsAt: { $lte: now } },
          { productId: { $in: productIds } }
        ]
      },
      {
        $set: {
          status: 'expired',
          'qualification.isQualified': false
        },
        $addToSet: {
          'qualification.hiddenReasons': 'stale-data'
        }
      }
    );

    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { isActive: false, isQualifiedDeal: false }, $addToSet: { hiddenReasons: 'stale-data' } }
    );

    return finishLog(log, 'success', {
      updatedCount: result.modifiedCount || 0,
      requestedCount: productIds.length
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const runFlipkartCategoryDeltaSync = async (category) => {
  const log = await createLog('delta-feed', { source: 'flipkart', category, metadata: { job: 'runFlipkartCategoryDeltaSync' } });
  try {
    const feed = await flipkart.getDeltaFeed(category, { inStock: true });
    const result = await upsertNormalizedProducts(feed.products, log);

    if (feed.deletedProductIds?.length) {
      await Product.updateMany(
        { source: 'flipkart', sourceProductId: { $in: feed.deletedProductIds } },
        { $set: { isActive: false, isQualifiedDeal: false }, $addToSet: { hiddenReasons: 'deleted-from-source' } }
      );
    }

    return finishLog(log, result.failedCount ? 'partial' : 'success', {
      requestedCount: feed.products.length,
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      nextCursor: feed.nextUrl,
      metadata: { ...(log.metadata || {}), version: feed.version }
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const refreshTrendingCategories = async () => {
  const log = await createLog('trending-refresh', { metadata: { job: 'refreshTrendingCategories' } });
  try {
    const rows = await Deal.aggregate([
      { $match: { status: 'active', 'qualification.isQualified': true } },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$product.category', avgScore: { $avg: '$dealScore' }, clicks: { $sum: '$clickCount' }, count: { $sum: 1 } } },
      { $sort: { clicks: -1, avgScore: -1 } },
      { $limit: 5 }
    ]);

    const categories = rows.map((row) => row._id);
    await Product.updateMany({}, { $set: { isTrending: false } });
    await Product.updateMany({ category: { $in: categories }, isQualifiedDeal: true }, { $set: { isTrending: true } });

    return finishLog(log, 'success', {
      updatedCount: categories.length,
      metadata: { trendingCategories: categories }
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const runDailyFullSync = async () => {
  const logs = [];
  for (const category of TARGET_CATEGORIES) {
    if (SOURCES.includes('flipkart')) {
      const log = await createLog('full-feed', { source: 'flipkart', category, metadata: { job: 'runDailyFullSync' } });
      try {
        const feed = await flipkart.getCategoryFeed(category, { inStock: true });
        const result = await upsertNormalizedProducts(feed.products, log);
        logs.push(await finishLog(log, result.failedCount ? 'partial' : 'success', {
          requestedCount: feed.products.length,
          insertedCount: result.insertedCount,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          nextCursor: feed.nextUrl,
          metadata: { ...(log.metadata || {}), version: feed.version }
        }));
      } catch (error) {
        logs.push(await finishLog(log, 'failed', { errorMessage: error.message }));
      }
    }
  }
  return logs;
};

const rebuildRankings = async () => {
  const log = await createLog('ranking-rebuild', { metadata: { job: 'rebuildRankings' } });
  try {
    const products = await Product.find({ isActive: true }).limit(5000);
    let updatedCount = 0;

    for (const product of products) {
      await upsertActiveDealForProduct(product);
      updatedCount += 1;
    }

    return finishLog(log, 'success', { requestedCount: products.length, updatedCount });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const removeDeadProducts = async () => {
  const log = await createLog('dead-product-cleanup', { metadata: { job: 'removeDeadProducts' } });
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Product.updateMany(
      {
        isActive: false,
        updatedAt: { $lte: cutoff }
      },
      { $addToSet: { hiddenReasons: 'dead-product' } }
    );
    return finishLog(log, 'success', { updatedCount: result.modifiedCount || 0 });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const generateTodaysBestDeals = async () => {
  const log = await createLog('best-deals-generation', { metadata: { job: 'generateTodaysBestDeals' } });
  try {
    const deals = await Deal.find({ status: 'active', 'qualification.isQualified': true })
      .sort({ dealScore: -1, detectedAt: -1 })
      .limit(100)
      .select('productId');

    const productIds = deals.map((deal) => deal.productId);
    await Product.updateMany({}, { $set: { isFeatured: false } });
    await Product.updateMany({ _id: { $in: productIds } }, { $set: { isFeatured: true } });

    return finishLog(log, 'success', {
      requestedCount: deals.length,
      updatedCount: productIds.length,
      metadata: { productIds }
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const evaluateUserPriceAlerts = async () => {
  const log = await createLog('price-alert-evaluation', { metadata: { job: 'evaluateUserPriceAlerts' } });
  try {
    const events = await evaluatePriceAlerts();
    return finishLog(log, 'success', {
      insertedCount: events.length,
      metadata: { generatedEvents: events.map((event) => event._id) }
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const generateDailyBestDealsEmails = async () => {
  const log = await createLog('daily-best-deals-email', { metadata: { job: 'generateDailyBestDealsEmails' } });
  try {
    const events = await generateDailyBestDealAlerts();
    return finishLog(log, 'success', {
      insertedCount: events.length,
      metadata: { generatedEvents: events.map((event) => event._id) }
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const archiveExpiredDeals = async () => {
  const log = await createLog('archive-expired-deals', { metadata: { job: 'archiveExpiredDeals' } });
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result = await Deal.updateMany(
      { status: 'expired', updatedAt: { $lte: cutoff } },
      { $set: { status: 'hidden' }, $addToSet: { 'qualification.hiddenReasons': 'archived-expired-deal' } }
    );
    return finishLog(log, 'success', { updatedCount: result.modifiedCount || 0 });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const rebuildDerivedStatistics = async () => {
  const log = await createLog('derived-statistics', { metadata: { job: 'rebuildDerivedStatistics' } });
  try {
    const stats = await Deal.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }, avgScore: { $avg: '$dealScore' } } }
    ]);
    return finishLog(log, 'success', { requestedCount: stats.length, metadata: { stats } });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

const computeEvergreenProducts = async () => {
  const log = await createLog('evergreen-products', { metadata: { job: 'computeEvergreenProducts' } });
  try {
    const products = await Product.find({
      isQualifiedDeal: true,
      rating: { $gte: 4 },
      reviewCount: { $gte: 100 },
      discountPercent: { $gte: 15 }
    }).sort({ dealScore: -1 }).limit(250);

    return finishLog(log, 'success', {
      requestedCount: products.length,
      metadata: { productIds: products.map((product) => product._id) }
    });
  } catch (error) {
    return finishLog(log, 'failed', { errorMessage: error.message });
  }
};

module.exports = {
  TARGET_CATEGORIES,
  archiveExpiredDeals,
  computeEvergreenProducts,
  expireStaleDeals,
  generateTodaysBestDeals,
  evaluateUserPriceAlerts,
  generateDailyBestDealsEmails,
  rebuildDerivedStatistics,
  rebuildRankings,
  refreshTopActiveDeals,
  refreshTrendingCategories,
  removeDeadProducts,
  runDailyFullSync,
  runFlipkartCategoryDeltaSync,
  validateHomepageItems
};

const Product = require('../models/Product');
const SourceSyncLog = require('../models/SourceSyncLog');
const { mapAmazonItem } = require('../services/connectors/amazon.connector');
const { mapFlipkartItem } = require('../services/connectors/flipkart.connector');
const { upsertActiveDealForProduct } = require('../services/deals/dealEngine');

const mapperBySource = {
  amazon: mapAmazonItem,
  flipkart: mapFlipkartItem
};

const ingestionController = {
  ingestProducts: async (req, res) => {
    let syncLog;

    try {
      const { source, products = [] } = req.body;
      const mapper = mapperBySource[source];

      if (!mapper) {
        return res.status(400).json({ message: 'Unsupported source. Use amazon or flipkart.' });
      }

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'products must be a non-empty array.' });
      }

      syncLog = await SourceSyncLog.create({
        source,
        syncType: 'manual-import',
        status: 'running',
        requestedCount: products.length,
        category: req.body.category,
        lastCursor: req.body.cursor,
        pageToken: req.body.pageToken
      });

      const results = [];
      let insertedCount = 0;
      let updatedCount = 0;
      let failedCount = 0;

      for (const rawProduct of products) {
        try {
          const normalized = mapper(rawProduct);
          const existing = await Product.exists({ source, sourceProductId: normalized.sourceProductId });
          const product = await Product.findOneAndUpdate(
            { source, sourceProductId: normalized.sourceProductId },
            { $set: normalized },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
          );

          const deal = await upsertActiveDealForProduct(product);
          if (existing) updatedCount += 1;
          else insertedCount += 1;
          results.push({ productId: product._id, dealId: deal._id, title: product.title });
        } catch (itemError) {
          failedCount += 1;
          results.push({
            sourceProductId: rawProduct.sourceProductId || rawProduct.productId || rawProduct.asin || rawProduct.ASIN,
            error: itemError.message
          });
        }
      }

      const finalStatus = failedCount > 0 && results.length > failedCount ? 'partial' : failedCount > 0 ? 'failed' : 'success';
      await syncLog.finish(finalStatus, {
        insertedCount,
        updatedCount,
        failedCount,
        nextCursor: req.body.nextCursor,
        metadata: {
          importedBy: req.user?._id,
          resultCount: results.length
        }
      });

      res.status(202).json({
        message: 'Products ingested successfully.',
        syncLogId: syncLog._id,
        status: finalStatus,
        count: results.length,
        insertedCount,
        updatedCount,
        failedCount,
        results
      });
    } catch (error) {
      if (syncLog) {
        await syncLog.finish('failed', { errorMessage: error.message });
      }
      res.status(500).json({ message: 'Error ingesting products', error: error.message });
    }
  }
};

module.exports = ingestionController;

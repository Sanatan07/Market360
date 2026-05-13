const Deal = require('../models/Deal');
const Product = require('../models/Product');
const SourceSyncLog = require('../models/SourceSyncLog');
const ClickEvent = require('../models/ClickEvent');
const AdminRule = require('../models/AdminRule');
const { upsertActiveDealForProduct } = require('../services/deals/dealEngine');

const getLatestSuccessfulSync = async (source) => SourceSyncLog.findOne({ source, status: 'success' })
  .sort({ finishedAt: -1, startedAt: -1 })
  .lean();

const adminOpsController = {
  getOverview: async (req, res) => {
    try {
      const [
        syncBySource,
        lastFlipkartSuccess,
        failedItems,
        staleDeals,
        hiddenDeals,
        analytics,
        rules
      ] = await Promise.all([
        SourceSyncLog.aggregate([
          { $sort: { startedAt: -1 } },
          { $group: { _id: '$source', lastRun: { $first: '$$ROOT' }, runs: { $sum: 1 }, failedRuns: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } }
        ]),
        getLatestSuccessfulSync('flipkart'),
        SourceSyncLog.find({ status: { $in: ['failed', 'partial'] } }).sort({ startedAt: -1 }).limit(20).lean(),
        Deal.find({ status: 'expired' }).populate('productId').sort({ updatedAt: -1 }).limit(25).lean(),
        Deal.find({ status: 'hidden' }).populate('productId').sort({ updatedAt: -1 }).limit(25).lean(),
        ClickEvent.aggregate([
          { $match: { clickedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
          { $group: { _id: '$source', clicks: { $sum: 1 }, estimatedCommission: { $sum: '$estimatedCommission' } } },
          { $sort: { clicks: -1 } }
        ]),
        AdminRule.find({ isActive: true }).sort({ createdAt: -1 }).limit(100).lean()
      ]);

      res.json({
        syncBySource,
        lastSuccessfulImport: {
          flipkart: lastFlipkartSuccess
        },
        failedItems,
        staleDeals,
        hiddenDeals,
        analytics,
        rules
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching admin overview', error: error.message });
    }
  },

  updateDealStatus: async (req, res) => {
    try {
      const { status, reason } = req.body;
      if (!['active', 'hidden', 'expired'].includes(status)) {
        return res.status(400).json({ message: 'Invalid deal status.' });
      }

      const deal = await Deal.findByIdAndUpdate(
        req.params.dealId,
        {
          $set: {
            status,
            ...(status === 'hidden' ? { 'qualification.isQualified': false } : {})
          },
          ...(reason ? { $addToSet: { 'qualification.hiddenReasons': reason } } : {})
        },
        { new: true }
      ).populate('productId');

      if (!deal) return res.status(404).json({ message: 'Deal not found' });
      if (deal.productId) {
        await Product.findByIdAndUpdate(deal.productId._id, {
          $set: {
            isActive: status === 'active',
            isQualifiedDeal: status === 'active'
          },
          ...(reason ? { $addToSet: { hiddenReasons: reason } } : {})
        });
      }

      res.json(deal);
    } catch (error) {
      res.status(500).json({ message: 'Error updating deal status', error: error.message });
    }
  },

  updateProductControls: async (req, res) => {
    try {
      const allowed = ['category', 'isFeatured', 'isActive', 'hiddenReasons'];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[key] = req.body[key];
      }

      const product = await Product.findByIdAndUpdate(req.params.productId, { $set: update }, { new: true });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      await upsertActiveDealForProduct(product, { skipDuplicateCheck: true });
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Error updating product controls', error: error.message });
    }
  },

  validateAffiliateLink: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.dealId).populate('productId');
      if (!deal) return res.status(404).json({ message: 'Deal not found' });

      let valid = false;
      try {
        const parsed = new URL(deal.affiliateUrl);
        valid = ['http:', 'https:'].includes(parsed.protocol);
      } catch (error) {
        valid = false;
      }

      if (!valid) {
        deal.status = 'hidden';
        deal.qualification = {
          ...(deal.qualification || {}),
          isQualified: false,
          hiddenReasons: [...new Set([...(deal.qualification?.hiddenReasons || []), 'broken-affiliate-link'])]
        };
        await deal.save();
      }

      res.json({ dealId: deal._id, valid, affiliateUrl: deal.affiliateUrl });
    } catch (error) {
      res.status(500).json({ message: 'Error validating affiliate link', error: error.message });
    }
  },

  createRule: async (req, res) => {
    try {
      const rule = await AdminRule.findOneAndUpdate(
        { type: req.body.type, value: req.body.value },
        {
          type: req.body.type,
          value: req.body.value,
          replacementValue: req.body.replacementValue,
          reason: req.body.reason,
          isActive: true,
          createdBy: req.user?._id
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (rule.type === 'brand-blacklist') {
        await Product.updateMany(
          { brand: new RegExp(`^${rule.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { $set: { isActive: false, isQualifiedDeal: false }, $addToSet: { hiddenReasons: 'blacklisted-brand' } }
        );
      }

      if (rule.type === 'product-blacklist') {
        const productBlacklistQuery = [{ sourceProductId: rule.value }];
        if (rule.value.match(/^[a-f\d]{24}$/i)) {
          productBlacklistQuery.push({ _id: rule.value });
        }
        await Product.updateMany(
          { $or: productBlacklistQuery },
          { $set: { isActive: false, isQualifiedDeal: false }, $addToSet: { hiddenReasons: 'blacklisted-product' } }
        );
      }

      if (rule.type === 'category-override' && rule.replacementValue) {
        await Product.updateMany(
          { category: rule.value },
          { $set: { category: rule.replacementValue }, $addToSet: { qualificationReasons: 'category-override' } }
        );
      }

      res.status(201).json(rule);
    } catch (error) {
      res.status(500).json({ message: 'Error creating admin rule', error: error.message });
    }
  },

  deleteRule: async (req, res) => {
    try {
      const rule = await AdminRule.findByIdAndUpdate(req.params.ruleId, { $set: { isActive: false } }, { new: true });
      if (!rule) return res.status(404).json({ message: 'Rule not found' });
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: 'Error disabling admin rule', error: error.message });
    }
  }
};

module.exports = adminOpsController;

const ClickEvent = require('../models/ClickEvent');

const toDate = (value, fallback) => (value ? new Date(value) : fallback);

const getDateRange = (query) => {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: toDate(query.start, defaultStart),
    end: toDate(query.end, now)
  };
};

const matchRange = (query) => {
  const { start, end } = getDateRange(query);
  return { clickedAt: { $gte: start, $lte: end } };
};

const analyticsController = {
  getAffiliateOverview: async (req, res) => {
    try {
      const match = matchRange(req.query);

      const [
        clicksByDeal,
        clicksByCategory,
        clicksBySource,
        ctrByHomepageSection,
        clicksByHour,
        clicksByDay,
        topMerchants,
        topEarningCategories,
        lowConversionProducts
      ] = await Promise.all([
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: '$dealId', clicks: { $sum: 1 }, estimatedCommission: { $sum: '$estimatedCommission' } } },
          { $sort: { clicks: -1 } },
          { $limit: 25 }
        ]),
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: '$category', clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } }
        ]),
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: '$source', clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } }
        ]),
        ClickEvent.aggregate([
          { $match: { ...match, section: { $ne: 'unknown' } } },
          { $group: { _id: { section: '$section', placement: '$placement' }, clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } }
        ]),
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: { $hour: '$clickedAt' }, clicks: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, clicks: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: '$store', clicks: { $sum: 1 }, estimatedCommission: { $sum: '$estimatedCommission' } } },
          { $sort: { clicks: -1 } },
          { $limit: 10 }
        ]),
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: '$category', clicks: { $sum: 1 }, estimatedCommission: { $sum: '$estimatedCommission' } } },
          { $sort: { estimatedCommission: -1 } },
          { $limit: 10 }
        ]),
        ClickEvent.aggregate([
          { $match: match },
          { $group: { _id: '$productId', clicks: { $sum: 1 }, conversions: { $sum: { $cond: ['$converted', 1, 0] } } } },
          { $addFields: { conversionRate: { $cond: [{ $eq: ['$clicks', 0] }, 0, { $divide: ['$conversions', '$clicks'] }] } } },
          { $match: { clicks: { $gte: 10 }, conversionRate: { $lte: 0.02 } } },
          { $sort: { clicks: -1 } },
          { $limit: 25 }
        ])
      ]);

      res.json({
        clicksByDeal,
        clicksByCategory,
        clicksBySource,
        ctrByHomepageSection,
        clicksByHour,
        clicksByDay,
        topMerchants,
        topEarningCategories,
        lowConversionProducts
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching affiliate analytics', error: error.message });
    }
  }
};

module.exports = analyticsController;

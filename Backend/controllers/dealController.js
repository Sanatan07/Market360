const Deal = require('../models/Deal');

const dealController = {
  getActiveDeals: async (req, res) => {
    try {
      const { source, category, limit = 50 } = req.query;
      const query = { status: 'active' };
      if (source) query.source = source;

      const deals = await Deal.find(query)
        .populate({
          path: 'productId',
          match: category ? { category } : undefined,
          select: '-__v'
        })
        .sort({ dealScore: -1, detectedAt: -1 })
        .limit(Math.min(Number(limit) || 50, 100))
        .lean();

      res.json(deals.filter((deal) => deal.productId));
    } catch (error) {
      res.status(500).json({ message: 'Error fetching active deals', error: error.message });
    }
  },

  getDealById: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.id).populate('productId').lean();
      if (!deal) return res.status(404).json({ message: 'Deal not found' });
      res.json(deal);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching deal', error: error.message });
    }
  }
};

module.exports = dealController;

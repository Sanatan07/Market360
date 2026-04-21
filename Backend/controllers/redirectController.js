const crypto = require('crypto');
const Deal = require('../models/Deal');
const ClickEvent = require('../models/ClickEvent');

const hashIp = (ip = '') => crypto.createHash('sha256').update(ip).digest('hex');

const redirectController = {
  goToDeal: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.dealId).populate('productId');
      if (!deal || deal.status !== 'active') {
        return res.status(404).json({ message: 'Deal not found or expired.' });
      }

      await ClickEvent.create({
        dealId: deal._id,
        productId: deal.productId?._id,
        source: deal.source,
        ipHash: hashIp(req.ip),
        userAgent: req.get('user-agent'),
        referrer: req.get('referer')
      });

      deal.clickCount += 1;
      deal.lastClickedAt = new Date();
      await deal.save();

      res.redirect(deal.affiliateUrl);
    } catch (error) {
      res.status(500).json({ message: 'Error redirecting to deal', error: error.message });
    }
  }
};

module.exports = redirectController;

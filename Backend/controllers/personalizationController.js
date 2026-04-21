const AlertEvent = require('../models/AlertEvent');
const PriceAlert = require('../models/PriceAlert');
const User = require('../models/User');
const { evaluatePriceAlerts } = require('../services/alerts/alertService');

const personalizationController = {
  getPreferences: async (req, res) => {
    const user = await User.findById(req.user._id).select('savedCategories personalization wishlist').populate('wishlist');
    res.json(user);
  },

  updatePreferences: async (req, res) => {
    const allowed = {};
    if (Array.isArray(req.body.savedCategories)) allowed.savedCategories = req.body.savedCategories;
    if (req.body.personalization) {
      allowed.personalization = {
        dailyBestDealsEmail: Boolean(req.body.personalization.dailyBestDealsEmail),
        defaultDiscountThreshold: Number(req.body.personalization.defaultDiscountThreshold || 40),
        preferredSources: req.body.personalization.preferredSources || [],
        maxPrice: req.body.personalization.maxPrice || undefined
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: allowed }, { new: true }).select('savedCategories personalization wishlist');
    res.json(user);
  },

  createAlert: async (req, res) => {
    const alert = await PriceAlert.create({
      userId: req.user._id,
      productId: req.body.productId,
      category: req.body.category,
      source: req.body.source,
      targetPrice: req.body.targetPrice,
      discountThreshold: req.body.discountThreshold || 40
    });
    res.status(201).json(alert);
  },

  getAlerts: async (req, res) => {
    const alerts = await PriceAlert.find({ userId: req.user._id, isActive: true }).populate('productId').sort({ createdAt: -1 });
    res.json(alerts);
  },

  deleteAlert: async (req, res) => {
    const alert = await PriceAlert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.user._id },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  },

  getNotifications: async (req, res) => {
    const events = await AlertEvent.find({ userId: req.user._id }).populate('productId').sort({ createdAt: -1 }).limit(50);
    res.json(events);
  },

  markNotificationRead: async (req, res) => {
    const event = await AlertEvent.findOneAndUpdate(
      { _id: req.params.eventId, userId: req.user._id },
      { $set: { status: 'read', readAt: new Date() } },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Notification not found' });
    res.json(event);
  },

  runAlertEvaluation: async (req, res) => {
    const events = await evaluatePriceAlerts();
    res.json({ generated: events.length });
  }
};

module.exports = personalizationController;

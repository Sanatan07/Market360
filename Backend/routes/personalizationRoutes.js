const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { writeLimiter } = require('../middleware/rateLimiters');
const {
  createAlert,
  deleteAlert,
  getAlerts,
  getNotifications,
  getPreferences,
  markNotificationRead,
  runAlertEvaluation,
  updatePreferences
} = require('../controllers/personalizationController');

router.use(auth);
router.get('/preferences', getPreferences);
router.put('/preferences', writeLimiter, updatePreferences);
router.get('/alerts', getAlerts);
router.post('/alerts', writeLimiter, createAlert);
router.delete('/alerts/:alertId', writeLimiter, deleteAlert);
router.get('/notifications', getNotifications);
router.patch('/notifications/:eventId/read', writeLimiter, markNotificationRead);
router.post('/alerts/evaluate', writeLimiter, isAdmin, runAlertEvaluation);

module.exports = router;

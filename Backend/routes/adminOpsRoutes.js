const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const {
  createRule,
  deleteRule,
  getOverview,
  updateDealStatus,
  updateProductControls,
  validateAffiliateLink
} = require('../controllers/adminOpsController');

router.use(auth, isAdmin);
router.get('/overview', getOverview);
router.patch('/deals/:dealId/status', updateDealStatus);
router.post('/deals/:dealId/validate-link', validateAffiliateLink);
router.patch('/products/:productId/controls', updateProductControls);
router.post('/rules', createRule);
router.delete('/rules/:ruleId', deleteRule);

module.exports = router;

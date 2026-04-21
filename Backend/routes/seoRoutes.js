const express = require('express');
const router = express.Router();
const { dealCollectionSchema, robots, sitemap } = require('../controllers/seoController');

router.get('/sitemap.xml', sitemap);
router.get('/robots.txt', robots);
router.get('/api/seo/deal-collection-schema', dealCollectionSchema);

module.exports = router;

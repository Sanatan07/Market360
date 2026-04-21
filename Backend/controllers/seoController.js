const Deal = require('../models/Deal');
const Product = require('../models/Product');

const siteUrl = () => (process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

const staticRoutes = [
  '/',
  '/best-deals-today',
  '/price-drop-alerts',
  '/deals/electronics',
  '/deals/kitchen-appliances',
  '/deals/under-1000',
  '/store/amazon',
  '/store/flipkart',
  '/content/best-bluetooth-headphones-under-2000',
  '/content/best-air-fryers-on-discount-this-week',
  '/content/top-laptop-deals-today-in-india'
];

const productSlug = (product) => product.slug || String(product._id);

const seoController = {
  sitemap: async (req, res) => {
    try {
      const base = siteUrl();
      const products = await Product.find({ isQualifiedDeal: true, isActive: true })
        .sort({ dealScore: -1 })
        .limit(1000)
        .select('_id slug updatedAt')
        .lean();

      const urls = [
        ...staticRoutes.map((route) => ({ loc: `${base}${route}`, lastmod: new Date().toISOString() })),
        ...products.map((product) => ({
          loc: `${base}/products/${product._id}-${productSlug(product)}`,
          lastmod: new Date(product.updatedAt || Date.now()).toISOString()
        }))
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`).join('\n')}\n</urlset>`;
      res.type('application/xml').send(xml);
    } catch (error) {
      res.status(500).json({ message: 'Error generating sitemap', error: error.message });
    }
  },

  robots: (req, res) => {
    const base = siteUrl();
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /profile\nDisallow: /wishlist\nSitemap: ${base}/sitemap.xml\n`);
  },

  dealCollectionSchema: async (req, res) => {
    try {
      const deals = await Deal.find({ status: 'active', 'qualification.isQualified': true })
        .populate('productId')
        .sort({ dealScore: -1 })
        .limit(20)
        .lean();

      const base = siteUrl();
      res.json({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: req.query.title || 'Market360 best deals',
        itemListElement: deals.filter((deal) => deal.productId).map((deal, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${base}/products/${deal.productId._id}-${productSlug(deal.productId)}`,
          item: {
            '@type': 'Product',
            name: deal.productId.title,
            image: deal.productId.images?.[0]?.url,
            brand: deal.productId.brand,
            offers: {
              '@type': 'Offer',
              priceCurrency: deal.productId.currency || 'INR',
              price: deal.currentPrice,
              availability: deal.productId.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url: `${base}/go/${deal._id}`
            }
          }
        }))
      });
    } catch (error) {
      res.status(500).json({ message: 'Error generating schema', error: error.message });
    }
  }
};

module.exports = seoController;

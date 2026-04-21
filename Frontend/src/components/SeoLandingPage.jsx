import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getActiveDeals, getDealRedirectUrl } from '../services/api';
import DealCard from './DealCard';
import SEO from './SEO';
import styles from './SeoLandingPage.module.css';

const PAGE_CONFIG = {
  'best-deals-today': {
    title: 'Best Deals Today in India',
    description: 'Fresh Amazon and Flipkart deals ranked by discount, rating, popularity, and price freshness.',
    filters: { sort: 'score', limit: 48 },
  },
  'price-drop-alerts': {
    title: 'Price Drop Alerts',
    description: 'Recently refreshed deals with meaningful discounts and verified affiliate links.',
    filters: { sort: 'newest', minDiscount: 20, limit: 48 },
  },
};

const CONTENT_CONFIG = {
  'best-bluetooth-headphones-under-2000': {
    title: 'Best Bluetooth Headphones Under ₹2000',
    description: 'A live, deal-led shortlist of Bluetooth headphones under ₹2000 from Amazon and Flipkart.',
    filters: { category: 'audio', maxPrice: 2000, minDiscount: 20 },
    intro: 'These picks are generated from current deal data, then structured for human review before publishing.',
  },
  'best-air-fryers-on-discount-this-week': {
    title: 'Best Air Fryers on Discount This Week',
    description: 'Air fryer deals with current discounts, ratings, and freshness signals.',
    filters: { category: 'kitchen-appliances', minDiscount: 20 },
    intro: 'Use this page as an editorial draft: data selects candidates, editors refine the final advice.',
  },
  'top-laptop-deals-today-in-india': {
    title: 'Top Laptop Deals Today in India',
    description: 'Laptop and computer deals ranked for Indian shoppers.',
    filters: { category: 'computers', minDiscount: 20 },
    intro: 'Laptop deals are ranked with discount, rating, freshness, and shopper click signals.',
  },
};

const routeToConfig = (params, pathname) => {
  if (pathname.startsWith('/deals/')) {
    const category = params.category;
    if (category === 'under-1000') {
      return {
        title: 'Best Deals Under ₹1000',
        description: 'Budget Amazon and Flipkart deals under ₹1000.',
        filters: { maxPrice: 1000, minDiscount: 20 },
      };
    }
    return {
      title: `${category.replace(/-/g, ' ')} deals`,
      description: `Verified ${category.replace(/-/g, ' ')} deals from Amazon and Flipkart.`,
      filters: { category, minDiscount: 20 },
    };
  }

  if (pathname.startsWith('/store/')) {
    const source = params.source;
    return {
      title: `${source} deals and offers`,
      description: `Curated ${source} affiliate deals with verified links and freshness checks.`,
      filters: { source, minDiscount: 20 },
    };
  }

  if (pathname.startsWith('/content/')) return CONTENT_CONFIG[params.slug];
  return PAGE_CONFIG[params.page] || PAGE_CONFIG['best-deals-today'];
};

const SeoLandingPage = ({ type }) => {
  const params = useParams();
  const [deals, setDeals] = useState([]);
  const pathname = window.location.pathname;
  const config = routeToConfig(params, pathname);
  const filterKey = JSON.stringify(config?.filters || {});

  useEffect(() => {
    const fetchDeals = async () => {
      const data = await getActiveDeals({ limit: 48, ...JSON.parse(filterKey) });
      setDeals(data);
    };
    fetchDeals().catch(() => setDeals([]));
  }, [config?.title, filterKey]);

  const products = useMemo(() => deals.map((deal) => ({
    ...deal.productId,
    activeDealId: deal._id,
    dealScore: deal.dealScore,
    salePrice: deal.currentPrice,
    listPrice: deal.originalPrice || deal.productId?.listPrice,
    dealUrl: getDealRedirectUrl(deal._id, { section: type || 'seo-page', placement: params.category || params.source || params.slug || 'seo' }),
  })), [deals, type, params.category, params.source, params.slug]);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: config?.title,
    itemListElement: products.slice(0, 20).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${window.location.origin}/products/${product._id}`,
      name: product.title,
    })),
  };

  return (
    <main className={styles.page}>
      <SEO
        title={`${config?.title || 'Market360 Deals'} | Market360`}
        description={config?.description}
        canonical={`${window.location.origin}${pathname}`}
        schema={schema}
      />
      <header className={styles.header}>
        <p>Market360 buying guide</p>
        <h1>{config?.title}</h1>
        <span>{config?.description}</span>
      </header>

      {config?.intro && <section className={styles.copy}><p>{config.intro}</p></section>}

      <nav className={styles.internalLinks}>
        <Link to="/best-deals-today">Best deals today</Link>
        <Link to="/deals/electronics">Electronics</Link>
        <Link to="/deals/kitchen-appliances">Kitchen deals</Link>
        <Link to="/store/amazon">Amazon</Link>
        <Link to="/store/flipkart">Flipkart</Link>
      </nav>

      <section className={styles.grid}>
        {products.map((product) => <DealCard key={product._id} product={product} section={type || 'seo-page'} />)}
      </section>
    </main>
  );
};

export default SeoLandingPage;

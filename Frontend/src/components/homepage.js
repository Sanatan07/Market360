import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { getActiveDeals, getDealRedirectUrl } from '../services/api';
import DealCard from './DealCard';
import styles from './homepage.module.css';

const toProduct = (deal, section) => ({
  ...deal.productId,
  activeDealId: deal._id,
  dealScore: deal.dealScore,
  salePrice: deal.currentPrice,
  listPrice: deal.originalPrice || deal.productId?.listPrice,
  dealUrl: getDealRedirectUrl(deal._id, { section, placement: deal.productId?.category || 'homepage' }),
});

const DealSection = ({ title, subtitle, products, section }) => {
  if (!products.length) return null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <Link to={`/products?section=${section}`}>See all</Link>
      </div>
      <div className={styles.dealGrid}>
        {products.slice(0, 4).map((product) => (
          <DealCard key={`${section}-${product._id}`} product={product} section={section} compact />
        ))}
      </div>
    </section>
  );
};

const Homepage = () => {
  const [deals, setDeals] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const data = await getActiveDeals({ limit: 80 });
        setDeals(data);
      } catch (error) {
        setDeals([]);
      }
    };
    fetchDeals();
  }, []);

  const products = useMemo(() => deals.map((deal) => toProduct(deal, 'homepage')), [deals]);
  const sections = useMemo(() => ({
    best: [...products].sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0)),
    electronics: products.filter((product) => ['electronics', 'mobiles-accessories', 'computers', 'audio'].includes(product.category)),
    kitchen: products.filter((product) => product.category === 'kitchen-appliances' && product.salePrice <= 5000),
    halfOff: products.filter((product) => (product.discountPercent || 0) >= 50),
    recent: [...products].sort((a, b) => new Date(b.lastSyncedAt || 0) - new Date(a.lastSyncedAt || 0)),
    clicked: [...products].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0)),
    picks: products.filter((product) => product.isFeatured || product.dealScore >= 55),
  }), [products]);

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/products?q=${encodeURIComponent(search)}`);
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Market360 Deals</p>
          <h1>Verified affiliate deals for Indian shoppers</h1>
          <p className={styles.heroCopy}>Flipkart offers ranked by discount, quality, freshness, and shopper interest.</p>
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <FaSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search headphones, mixer grinders, shoes..."
            />
            <button type="submit">Search</button>
          </form>
          <div className={styles.chips}>
            {['electronics', 'mobiles-accessories', 'audio', 'kitchen-appliances', 'fashion'].map((category) => (
              <Link key={category} to={`/products?category=${category}`}>{category.replace(/-/g, ' ')}</Link>
            ))}
          </div>
        </div>
      </section>

      <DealSection title="Best deals today" subtitle="Highest ranked by discount, quality, and freshness." products={sections.best} section="best-deals-today" />
      <DealSection title="Trending electronics" products={sections.electronics} section="trending-electronics" />
      <DealSection title="Kitchen appliances under ₹5,000" products={sections.kitchen} section="kitchen-under-5000" />
      <DealSection title="50%+ off" products={sections.halfOff} section="fifty-plus-off" />
      <DealSection title="Recently added deals" products={sections.recent} section="recently-added" />
      <DealSection title="Most clicked today" products={sections.clicked} section="most-clicked-today" />
      <DealSection title="Editor’s picks" products={sections.picks} section="editors-picks" />
    </main>
  );
};

export default Homepage;

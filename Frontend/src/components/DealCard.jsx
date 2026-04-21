import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaExternalLinkAlt } from 'react-icons/fa';
import { createPriceAlert } from '../services/api';
import { formatINR, getDiscount, needsAmazonDisclaimer, sourceLabel, verifiedAgo } from '../utils/dealFormat';
import styles from './DealCard.module.css';

const DealCard = ({ product, section = 'deal-card', compact = false }) => {
  const discount = getDiscount(product);
  const imageUrl = product?.images?.[0]?.url || '/placeholder-image.jpg';
  const dealUrl = product?.dealUrl;
  const handleAlert = async () => {
    try {
      await createPriceAlert({ productId: product._id, discountThreshold: 40 });
    } catch (error) {
      // Authenticated users can manage alerts from Profile > Alerts.
    }
  };

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.imageWrap}>
        <img src={imageUrl} alt={product.title} />
        <span className={styles.badge}>{sourceLabel(product.source)}</span>
        {discount > 0 && <span className={styles.discount}>{discount}% off</span>}
      </div>
      <div className={styles.body}>
        <Link to={`/products/${product._id}`} className={styles.title}>{product.title}</Link>
        <div className={styles.priceRow}>
          <strong>{formatINR(product.salePrice)}</strong>
          {product.listPrice > product.salePrice && <span>{formatINR(product.listPrice)}</span>}
        </div>
        <div className={styles.metaRow}>
          <span><FaStar /> {product.rating ? product.rating.toFixed?.(1) || product.rating : 'New'}</span>
          <span>{verifiedAgo(product.priceVerifiedAt || product.lastSyncedAt)}</span>
        </div>
        {needsAmazonDisclaimer(product) && (
          <p className={styles.disclaimer}>Price and availability may change on Amazon.</p>
        )}
        <a
          href={dealUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.cta}
          data-section={section}
        >
          <FaExternalLinkAlt /> View Deal
        </a>
        <button className={styles.alertButton} type="button" onClick={handleAlert}>
          Notify at 40%+
        </button>
      </div>
    </article>
  );
};

export default DealCard;

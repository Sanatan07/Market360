// Homepage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassyBackground from './GlassyBackground';
import styles from './homepage.module.css';

const Homepage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleShopNow = () => navigate('/products');

  return (
    <div className={styles.container}>
      <GlassyBackground />
      <div className={styles.content}>
        <div className={`${styles.tagline} ${isVisible ? styles.visible : ''}`}>
          Discover Premium Shopping Excellence
        </div>
        
        <div className={`${styles.titleContainer} ${isVisible ? styles.visible : ''}`}>
          <h1 className={styles.title}>
            <span className={styles.glass1}>M</span>
            <span className={styles.glass2}>A</span>
            <span className={styles.glass3}>R</span>
            <span className={styles.glass1}>K</span>
            <span className={styles.glass2}>E</span>
            <span className={styles.glass3}>T</span>
            <span className={styles.glass1}>3</span>
            <span className={styles.glass2}>6</span>
            <span className={styles.glass3}>0</span>
          </h1>
          <div className={styles.subtitle}>Marketplace</div>
        </div>
        
        <div className={styles.buttonContainer}>
          <button 
            className={`${styles.shopButton} ${isVisible ? styles.visible : ''}`}
            onClick={handleShopNow}
          >
            Shop Now <span className={styles.arrow}>→</span>
          </button>
       
        </div>
      </div>
    </div>
  );
};

export default Homepage;
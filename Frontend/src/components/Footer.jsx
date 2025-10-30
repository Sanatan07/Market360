import React from 'react';
import { Link } from 'react-router-dom';
import styles from './footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Follow Us Section */}
          <div className={styles.footerSection}>
            <h3>Follow Us</h3>
            <div className={styles.footerLinks}>
              <Link to="/social/twitter">Twitter</Link>
              <Link to="/social/facebook">Facebook</Link>
              <Link to="/social/instagram">Instagram</Link>
              <Link to="/social/youtube">YouTube</Link>
            </div>
          </div>

          {/* About Section */}
          <div className={styles.footerSection}>
            <h3>About</h3>
            <div className={styles.footerLinks}>
              <Link to="/about">About Us</Link>
              <Link to="/help">Help Center</Link>
              <Link to="/careers">Careers</Link>
              <Link to="/contact">Contact Us</Link>
            </div>
          </div>

          {/* More Section */}
          <div className={styles.footerSection}>
            <h3>More</h3>
            <div className={styles.footerLinks}>
              <Link to="/deals">Deal Alerts</Link>
              <Link to="/live">Live Deals</Link>
              <Link to="/rewards">Rewards Program</Link>
            </div>
          </div>

          {/* Legal Section */}
          <div className={styles.footerSection}>
            <h3>Legal</h3>
            <div className={styles.footerLinks}>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms and Policies</Link>
              <Link to="/accessibility">Accessibility</Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={styles.footerBottom}>
          <div className={styles.footerBottomContent}>
            <div className={styles.copyright}>
              © {currentYear} Market360. All Rights Reserved.
            </div>
            <div className={styles.footerBottomLinks}>
              <Link to="/redesign">Redesign</Link>
              <span className={styles.separator}>•</span>
              <Link to="/mobile">Mobile</Link>
              <span className={styles.separator}>•</span>
              <Link to="/classic">Classic</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
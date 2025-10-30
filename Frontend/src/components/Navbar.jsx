import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import { BsBellFill } from 'react-icons/bs';
import { IoAddCircle } from 'react-icons/io5';
import { FaUser } from 'react-icons/fa';
import { IoIosArrowDown } from 'react-icons/io';
import { HiTrendingUp } from 'react-icons/hi';
import { getProducts, getProductsApproved } from '../services/api';
import { useAuth } from '../context/AuthContext'; // Make sure to import useAuth
import market from '../assets/market360.jpeg';
import Wishlist from './Wishlist';
import { BsHeartFill } from 'react-icons/bs';
import { useLocation } from 'react-router-dom';
import DarkModeToggle from 'react-dark-mode-toggle';
import { RiAdminFill } from "react-icons/ri";
// Remove currentUser and handleLogout from props since we'll get them from useAuth
const Navbar = ({ handlePostDeal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [searchHistory, setSearchHistory] = useState(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  // Handle search input with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch(searchTerm);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async (value) => {
    try {
      const products = await getProductsApproved({ search: value });
      // Filter products based on search term
      const filteredProducts = products.filter(product => 
        product.title.toLowerCase().includes(value.toLowerCase()) ||
        product.description?.toLowerCase().includes(value.toLowerCase())
      );
      setSearchResults(filteredProducts);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSearchResults(true);
  };
// Navbar.js
const handleSearchSubmit = () => {
  if (searchTerm.trim()) {
    navigate(`/?q=${encodeURIComponent(searchTerm)}`);
    const updatedHistory = [
      searchTerm,
      ...searchHistory.filter(item => item !== searchTerm)
    ].slice(0, 5);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    setShowSearchResults(false);
  }
};

const handleThemeToggle = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  setIsDarkMode(newTheme === 'dark');
};
const [isDarkMode, setIsDarkMode] = useState(
  document.documentElement.getAttribute('data-theme') === 'dark'
);


  const handleSearchItemClick = (item) => {
    setSearchTerm(item);
    handleSearch(item);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(`.${styles.searchSection}`)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={styles.navbarWrapper}>
      <div className={styles.topBanner}>
        TheMarket360 is community-supported. We may get paid by brands for deals, including promoted items.
      </div>

      <nav className={styles.mainNav}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            {/* <img src={market} alt="Market360" /> */}
            <h4>TheMarket360</h4>
          </Link>

          <div className={styles.searchSection}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search deals, coupons, stores and more..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              />
              <button 
                className={styles.searchButton}
                onClick={handleSearchSubmit}
              >
                <svg className={styles.searchIcon} viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>
              
              {/* Search Results and History Dropdown */}
              {showSearchResults && (searchResults.length > 0 || searchHistory.length > 0) && (
                <div className={styles.searchResults}>
                  {searchTerm && searchResults.length > 0 ? (
                    // Show filtered results when searching
                    <>
                      <div className={styles.searchResultsHeader}>Search Results</div>
                      {searchResults.map((product) => (
                        <Link
                          key={product._id}
                          to={`/products/${product._id}`}
                          className={styles.searchResultItem}
                          onClick={() => setShowSearchResults(false)}
                        >
                          <div className={styles.searchResultContent}>
                            <span className={styles.productTitle}>{product.title}</span>
                            <span className={styles.productPrice}>${product.salePrice}</span>
                          </div>
                        </Link>
                      ))}
                    </>
                  ) : (
                    // Show search history when input is empty
                    searchHistory.length > 0 && (
                      <>
                        <div className={styles.searchResultsHeader}>Recent Searches</div>
                        {searchHistory.map((item, index) => (
                          <div
                            key={index}
                            className={styles.searchHistoryItem}
                            onClick={() => handleSearchItemClick(item)}
                          >
                            <span className={styles.historyIcon}>🕒</span>
                            {item}
                          </div>
                        ))}
                      </>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Rest of navbar content... */}
            <div className={styles.mainNavLinks}>
              {/* ... existing nav links ... */}
            </div>
          </div>

          <div className={styles.actionButtons}>
          <DarkModeToggle
  onChange={handleThemeToggle}
  checked={isDarkMode}
  size={80}
  className={styles.switch}  // Correct way to use styles
  style={{ 
    margin: '10px'

  }}
/>
      
      <button 
        onClick={handlePostDeal}
        className={styles.actionButton}
        type="button"
      >
        <IoAddCircle className={styles.icon} style={{color: '#2196f3'}} />
        <span>Post a Deal</span>
      </button>

      <Link to="/Wishlist" className={styles.actionButton}>
              <BsHeartFill className={styles.icon} style={{ color: '#e60023' }} />
              <span>Wishlist</span>
            </Link>
            <Link to="/Admin" className={styles.actionButton}>
              <RiAdminFill className={styles.icon} style={{ color: '#21db53' }} />
              <span>Admin</span>
            </Link>
      {currentUser ? (
        <div className={styles.userSection}>
          <button 
            onClick={handleProfileClick}
            className={styles.userProfileButton}
          >
            <FaUser className={styles.userIcon} />
            <span>Hello, {currentUser.username || currentUser.name}</span>
          </button>
          <button 
            onClick={handleLogout} 
            className={styles.actionButton}
            type="button"
          >
            <span>Logout</span>
          </button>
        </div>
      ) : (
        <Link to="/auth" className={styles.actionButton}>
          <FaUser className={styles.icon} style={{color: '#ff7043'}} />
          <span>Sign Up</span>
        </Link>
      )}
    </div>
        </div>
      </nav>

      {/* <nav className={styles.secondaryNav}>
        <div className={styles.container}>
          <div className={styles.secondaryNavLinks}>
            
            <Link to="/trending" className={styles.secondaryNavItem} style={{ color: 'black',fontWeight:'lighter'}}>
            Trending
           <HiTrendingUp className={styles.trendingIcon} />
           
           </Link>
            <Link to="/tool-deals" className={styles.secondaryNavItem}>Tool Deals</Link>
            <Link to="/tech-deals" className={styles.secondaryNavItem}>Tech Deals</Link>
            <Link to="/apparel" className={styles.secondaryNavItem}>Apparel</Link>
            <Link to="/credit-card-offers" className={styles.secondaryNavItem}>Credit Card Offers</Link>
            <Link to="/laptops" className={styles.secondaryNavItem}>Laptops & Computers</Link>
            <Link to="/video-games" className={styles.secondaryNavItem}>Video Games</Link>
            <Link to="/home-deals" className={styles.secondaryNavItem}>Home Deals</Link>
            <Link to="/credit-card-comparison" className={styles.secondaryNavItem}>Credit Card Comparison Tool</Link>
            <Link to="/sneaker-deals" className={styles.secondaryNavItem}>Sneaker Deals</Link>
            <Link to="/grocery-deals" className={styles.secondaryNavItem}>Grocery Deals</Link>
          </div>
        </div>
      </nav> */}
    </div>
  );
};

export default Navbar;
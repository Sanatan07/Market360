import React, { useState, useEffect } from 'react';
import { getWishlist, removeFromWishlist } from '../services/api';
import styles from './Wishlist.module.css';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const data = await getWishlist();
        setWishlist(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load wishlist');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      setWishlist(prev => prev.filter(item => item._id !== productId));
      toast.success('Product removed from wishlist');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove product');
    }
  };

  if (loading) return <div className={styles.loading}>Loading wishlist...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Wishlist</h1>
      {wishlist.length === 0 ? (
        <div className={styles.empty}>
          <img 
            src="https://imgs.search.brave.com/nY2dFQ_vV9k6Sqas_m2LizvNo-7pPgapA0LV9QZQ1J0/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzEwLzM4LzI0LzQx/LzM2MF9GXzEwMzgy/NDQxMTRfb0x5QTJt/RUNNYVRWNkhQNXh1/UjlhekJXRUFHMEYx/bTIuanBn" 
            alt="Empty Wishlist" 
            className={styles.emptyImage}
          />
          <p className={styles.emptyText}>Your wishlist is empty!</p>
        </div>
      ) : (
        <div className={styles.products}>
          {wishlist.map((product) => (
            <div key={product._id} className={styles.productCard}>
              <div className={styles.productImage}>
                <img 
                  src={product.images[0]?.url || '/placeholder-image.jpg'} 
                  alt={product.title} 
                  className={styles.productImg}
                />
              </div>
              <div className={styles.productInfo}>
                <h3 className={styles.productTitle}>{product.title}</h3>
                <p className={styles.productDescription}>
                  {product.description.substring(0, 100)}...
                </p>
                <div className={styles.productMeta}>
                  <span className={styles.salePrice}>
                    ${product.salePrice}
                  </span>
                  <span className={styles.listPrice}>
                    ${product.listPrice}
                  </span>
                  <span className={styles.store}>
                    {product.store}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(product._id)}
                  className={styles.removeButton}
                >
                  Remove from Wishlist
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
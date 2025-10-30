import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toggleDislike, toggleLike, getProductById } from '../services/api';
import styles from './ProductDescription.module.css';
import { getWishlist, addToWishlist, removeFromWishlist, incrementProductView } from '../services/api';
import toast from 'react-hot-toast';
import { FaHeart } from "react-icons/fa";
import { CiHeart } from "react-icons/ci";
import { FaShare } from "react-icons/fa";

const ProductDescription = ({ currentUser }) => {
  const [products, setProducts] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [wishlistedProducts, setWishlistedProducts] = useState(new Set());

  const handleLike = useCallback(async (productId) => {
    try {
      if (!currentUser) return toast.error('Please log in');
      const { likeCount, dislikeCount } = await toggleLike(productId, {
        action: 'like',
        userId: currentUser._id
      });

      // Directly update the state with the new like/dislike counts
      setProduct(prevProduct => ({
        ...prevProduct,
        likeCount,
        dislikeCount,
      }));

    } catch (error) {
      toast.error('Failed to update like status');
    }
  }, [currentUser]);

  const handleDislike = useCallback(async (productId) => {
    try {
      if (!currentUser) return toast.error('Please log in');
      const { likeCount, dislikeCount } = await toggleDislike(productId, {
        action: 'dislike',
        userId: currentUser._id
      });

      // Directly update the state with the new like/dislike counts
      setProduct(prevProduct => ({
        ...prevProduct,
        likeCount,
        dislikeCount,
      }));

    } catch (error) {
      toast.error('Failed to update dislike status');
    }
  }, [currentUser]);
  
  const handleViewDeal = useCallback(async (productId, dealUrl) => {
    try {
      window.open(dealUrl, '_blank'); // Open the deal page first
      await incrementProductView(productId); // Then update the view count
      toast.success('View count updated');
    } catch (error) {
      toast.error('Failed to track view');
    }
  }, []);
  
  const handleShareProduct = async (productId) => {
    const shareUrl = `${window.location.origin}/products/${productId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      const tempInput = document.createElement('input');
      document.body.appendChild(tempInput);
      tempInput.value = shareUrl;
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }
    toast.success('Link copied to clipboard');
  };

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const wishlistItems = await getWishlist();
        const wishlistProductIds = new Set(wishlistItems.map(product => product._id));
        setWishlistedProducts(wishlistProductIds);
      } catch (error) {
        toast.error('Failed to fetch wishlist');
      }
    };

    fetchWishlist();
  }, []);

  const handleWishlistToggle = async (productId) => {
    try {
      if (wishlistedProducts.has(productId)) {
        await removeFromWishlist(productId);
        setWishlistedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast.success('Product removed from wishlist');
      } else {
        await addToWishlist(productId);
        setWishlistedProducts(prev => {
          const newSet = new Set(prev);
          newSet.add(productId);
          return newSet;
        });
        toast.success('Product added to wishlist');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update wishlist');
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        // Ensure images array exists
        const productWithImages = {
          ...data,
          images: data.images || []
        };
        console.log('Fetched product data:', productWithImages);
        setProduct(productWithImages);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(true);
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const discount = product && product.listPrice > 0
    ? Math.round(((product.listPrice - product.salePrice) / product.listPrice) * 100)
    : 0;

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorScreen}>
        <h2 className={styles.errorTitle}>Product Not Found</h2>
        <p className={styles.errorText}>The deal you're looking for doesn't exist or has been removed.</p>
        <button 
          onClick={() => navigate('/')}
          className={styles.btnPrimary}>
          Return to Deals
        </button>
      </div>
    );
  }

  if (!product) {
    return <div className={styles.errorScreen}>Loading...</div>;
  }

  return (
    <div className={styles.productContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>{product.title}</h1>
        <button 
          onClick={() => navigate('/')}
          className={styles.btnBack}
        >
          ← Back to Deals
        </button>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.imageSection}>
          <div className={styles.productImageContainer}>
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[selectedImageIndex].url}
                alt={product.title}
                className={styles.productImage}
              />
            ) : (
              <div className={styles.noImage}>
                No Image Available
              </div>
            )}
            
            {product.images && product.images.length > 1 && (
              <div className={styles.gallery}>
                {product.images.map((image, index) => (
                  <div 
                    key={index} 
                    className={`${styles.galleryItem} ${index === selectedImageIndex ? styles.active : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img 
                      src={image.url} 
                      alt={`${product.title} - view ${index + 1}`} 
                      className={styles.galleryThumb}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={styles.detailsSection}>
          <div className={styles.priceInfo}>
            <div className={styles.priceBlock}>
              <span className={styles.salePrice}>${product.salePrice?.toFixed(2) || '0.00'}</span>
              {product.listPrice > 0 && (
                <span className={styles.originalPrice}>${product.listPrice?.toFixed(2)}</span>
              )}
              {discount > 0 && (
                <span className={styles.discount}>
                  {discount}% OFF
                </span>
              )}
            </div>

            <div className={styles.storeInfo}>
              <p>Available at <strong>{product.store || 'N/A'}</strong></p>
              <p>Category: <strong>{product.category || 'N/A'}</strong></p>
            </div>

            {product.dealUrl && (
              // <a
              //   href={product.dealUrl}
              //   target="_blank"
              //   rel="noopener noreferrer"
              //   className={styles.btnBuy}
              // >
              //   Get Deal at {product.store}
              // </a>
                                <button
                onClick={() => handleViewDeal(product._id, product.dealUrl)}
                className={styles.btnBuy}
                  target="_blank"
                                  rel="noopener noreferrer"
              >
                Get Deal at {product.store}
              </button>
            )}
            {/* Heart Button */}
            <button
              className={styles.heartButton}
              onClick={() => handleWishlistToggle(product._id)}>
              {wishlistedProducts.has(product._id) ? <CiHeart /> :<FaHeart /> }
            </button>
            {/* Heart Button */}

            {/* Like and Dislike Button */}
            <button 
              onClick={() => handleLike(product._id)}
              className={`${styles.likeButton} ${product.userLikes ? styles.active : ''}`}
            >
              👍 {product.likeCount}
            </button>
            <button 
              onClick={() => handleDislike(product._id)}
              className={`${styles.dislikeButton} ${product.userDislikes ? styles.active : ''}`}
            >
              👎 {product.dislikeCount}
            </button>
            {/* Like and Dislike Button */}

            {/* Share Button */}
            <button onClick={() => handleShareProduct(product._id)} className={styles.shareButton}>
              <FaShare />
            </button>
            {/* Share Button */}
          </div>
            
          <div className={styles.descriptionSection}>
            <h2 className={styles.descriptionTitle}>Product Details</h2>
            <p className={styles.descriptionText}>
              {product.description || "No description available"}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProductDescription;

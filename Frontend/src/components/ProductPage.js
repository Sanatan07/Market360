import React, { useState, useEffect, useCallback } from 'react';
import { createProduct, toggleDislike, toggleLike, getProductsApproved, incrementProductView, getActiveDeals, getDealRedirectUrl } from '../services/api';
import styles from './ProductPage.module.css';
import ProductFilter from './ProductFilter';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getWishlist, addToWishlist, removeFromWishlist } from '../services/api';
import { FaShare } from "react-icons/fa";
import { FaHeart } from "react-icons/fa";
import { CiHeart } from "react-icons/ci";
import { useLocation } from 'react-router-dom';
import DealCard from './DealCard';
import { getDiscount } from '../utils/dealFormat';

const ProductPage = ({ showModal, setShowModal }) => {
  const [products, setProducts] = useState([]);
  const [currentUser] = useState({ _id: 'user123', name: 'Test User' });
  const [newProduct, setNewProduct] = useState({
    dealUrl: '',
    title: '',
    salePrice: '',
    listPrice: '',
    description: '',
    category: '',
    store: '',
    images: []
  });
  const [imagesPreview, setImagesPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchTermFromURL = searchParams.get('q') || '';
  const categoryFromURL = searchParams.get('category') || '';
  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Books', 
    'Sports & Outdoors', 'Toys & Games', 'Beauty', 'Automotive'
  ];

  // State for filtering
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filters, setFilters] = useState({
    priceRange: { min: 0, max: 100000 },
    categories: categoryFromURL ? [categoryFromURL] : [],
    searchTerm: searchTermFromURL,
    source: '',
    minDiscount: 0,
    minRating: 0,
    brand: '',
    availability: 'in-stock',
    sortBy: 'dealScore',
  });
  const [wishlistedProducts, setWishlistedProducts] = useState(new Set());

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

// ProductPage.js
useEffect(() => {
  const fetchProducts = async () => {
    try {
      const deals = await getActiveDeals({});
      const dealProducts = deals.map((deal) => ({
        ...deal.productId,
        activeDealId: deal._id,
        dealScore: deal.dealScore,
        salePrice: deal.currentPrice,
        listPrice: deal.originalPrice || deal.productId?.listPrice,
        dealUrl: getDealRedirectUrl(deal._id, { section: 'deals-grid', placement: deal.productId?.category || 'unknown' })
      }));
      const data = dealProducts.length > 0 ? dealProducts : await getProductsApproved({ search: searchTermFromURL });
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      try {
        const data = await getProductsApproved({ search: searchTermFromURL });
        setProducts(data);
        setFilteredProducts(data);
      } catch (fallbackError) {
        toast.error('Failed to fetch products');
      }
    }
  };
  fetchProducts();
}, [searchTermFromURL]);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      searchTerm: searchTermFromURL,
    }));
  }, [searchTermFromURL]);

  useEffect(() => {
    const applyFilters = () => {
      let result = products.filter((product) =>
        product.salePrice >= filters.priceRange.min &&
        product.salePrice <= filters.priceRange.max &&
        getDiscount(product) >= Number(filters.minDiscount || 0) &&
        (!filters.source || product.source === filters.source) &&
        (!filters.minRating || Number(product.rating || 0) >= Number(filters.minRating)) &&
        (!filters.brand || product.brand?.toLowerCase().includes(filters.brand.toLowerCase())) &&
        (filters.availability !== 'in-stock' || product.inStock !== false) &&
        (filters.searchTerm === '' ||
          (product.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            product.description?.toLowerCase().includes(filters.searchTerm.toLowerCase())))
      );

      if (filters.categories.length > 0) {
        result = result.filter(product => filters.categories.includes(product.category));
      }

      result = [...result].sort((a, b) => {
        if (filters.sortBy === 'newest') return new Date(b.lastSyncedAt || b.createdAt || 0) - new Date(a.lastSyncedAt || a.createdAt || 0);
        if (filters.sortBy === 'discount') return getDiscount(b) - getDiscount(a);
        if (filters.sortBy === 'popularity') return (b.clickCount || b.viewCount || 0) - (a.clickCount || a.viewCount || 0);
        return (b.dealScore || 0) - (a.dealScore || 0);
      });

      setFilteredProducts(result);
    };
    applyFilters();
  }, [filters, products]);

  const handleFilterUpdate = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  };

  const handleLike = useCallback(async (productId) => {
    try {
      if (!currentUser) return toast.error('Please log in');
      const { likeCount, dislikeCount } = await toggleLike(productId, {
        action: 'like',
        userId: currentUser._id
      });
      setProducts(products.map(product => 
        product._id === productId 
          ? { ...product, likeCount, dislikeCount } 
          : product
      ));
    } catch (error) {
      toast.error('Failed to update like status');
    }
  }, [currentUser, products]);

  const handleDislike = useCallback(async (productId) => {
    try {
      if (!currentUser) return toast.error('Please log in');
      const { likeCount, dislikeCount } = await toggleDislike(productId, {
        action: 'dislike',
        userId: currentUser._id
      });
      setProducts(products.map(product => 
        product._id === productId 
          ? { ...product, likeCount, dislikeCount } 
          : product
      ));
    } catch (error) {
      toast.error('Failed to update dislike status');
    }
  }, [currentUser, products]);

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

  const handleImageChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    const createPreviews = [];
    const addImages = [];
    
    files.forEach(file => {
      if (file.size > 5e6) {
        toast.error('Image exceeds 5MB limit');
        return;
      }
      addImages.push(file);
      createPreviews.push(URL.createObjectURL(file));
    });

    setNewProduct(prev => ({
      ...prev,
      images: [...prev.images, ...addImages]
    }));
    setImagesPreview(prev => [...prev, ...createPreviews]);
  }, []);

  const removeImage = (index) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    
    URL.revokeObjectURL(imagesPreview[index]);
    setImagesPreview(prev => prev.filter((_, i) => i !== index));
  };
  const handleViewDeal = useCallback(async (productId, dealUrl) => {
    try {
      window.open(dealUrl, '_blank'); // Open the deal page first
      await incrementProductView(productId); // Then update the view count
      toast.success('View count updated');
    } catch (error) {
      toast.error('Failed to track view');
    }
  }, []);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    Object.keys(newProduct).forEach(key => {
        if (key === 'images') return;
        formData.append(key, newProduct[key]);
    });

    // Append each image file individually
    newProduct.images.forEach(file => {
        formData.append('images', file); // Changed from 'images[]' to 'images'
    });

    try {
        await createProduct(formData);
        toast.success('Product added successfully');
        setShowModal(false);
        // Reset form
        setNewProduct({
            dealUrl: '',
            title: '',
            salePrice: '',
            listPrice: '',
            description: '',
            category: '',
            store: '',
            images: []
        });
        setImagesPreview([]);

        // Refresh products
        const updatedProducts = await getProductsApproved({});
        setProducts(updatedProducts);
    } catch (error) {
        toast.error(error.message || 'Failed to create product');
    } finally {
        setLoading(false);
    }
};


  return (
    
    <div className={styles.container}>
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Add New Deal</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="url"
                placeholder="Deal URL"
                value={newProduct.dealUrl}
                onChange={(e) => setNewProduct({ ...newProduct, dealUrl: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Deal Title"
                value={newProduct.title}
                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Sale Price"
                value={newProduct.salePrice}
                onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="List Price"
                value={newProduct.listPrice}
                onChange={(e) => setNewProduct({ ...newProduct, listPrice: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                required
              />
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Store"
                value={newProduct.store}
                onChange={(e) => setNewProduct({ ...newProduct, store: e.target.value })}
                required
              />
              <div className={styles.imageUploadSection}>
                <div className={styles.imagesPreviewContainer}>
                  {imagesPreview.map((preview, index) => (
                    <div key={index} className={styles.imagePreviewItem}>
                      <div className={styles.previewContainer}>
                        <img 
                          src={preview} 
                          alt={`Preview ${index}`} 
                          className={styles.imagePreview} 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeImage(index)}
                        className={styles.removeImage}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                {newProduct.images.length < 10 && (
                  <div className={styles.uploadContainer}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      id="dealImage"
                      className={styles.fileInput}
                    />
                    <label htmlFor="dealImage" className={styles.uploadLabel}>
                      🖼️ Add More Images
                    </label>
                  </div>
                )}
              </div>
              <div className={styles.modalButtons}>
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  Submit New Deal
                </button>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.contentWrapper}>
        <div className={styles.filterSidebar}>
          <div className={styles.quickFilters}>
            <input
              type="search"
              placeholder="Search deals"
              value={filters.searchTerm}
              onChange={(event) => handleFilterUpdate({ searchTerm: event.target.value })}
            />
            <select value={filters.source} onChange={(event) => handleFilterUpdate({ source: event.target.value })}>
              <option value="">Amazon + Flipkart</option>
              <option value="amazon">Amazon</option>
              <option value="flipkart">Flipkart</option>
            </select>
            <select value={filters.minDiscount} onChange={(event) => handleFilterUpdate({ minDiscount: event.target.value })}>
              <option value="0">Any discount</option>
              <option value="20">20%+ off</option>
              <option value="40">40%+ off</option>
              <option value="50">50%+ off</option>
            </select>
            <select value={filters.minRating} onChange={(event) => handleFilterUpdate({ minRating: event.target.value })}>
              <option value="0">Any rating</option>
              <option value="3.5">3.5+ stars</option>
              <option value="4">4+ stars</option>
            </select>
            <input
              type="search"
              placeholder="Brand"
              value={filters.brand}
              onChange={(event) => handleFilterUpdate({ brand: event.target.value })}
            />
            <select value={filters.availability} onChange={(event) => handleFilterUpdate({ availability: event.target.value })}>
              <option value="in-stock">In stock only</option>
              <option value="all">All availability</option>
            </select>
            <select value={filters.sortBy} onChange={(event) => handleFilterUpdate({ sortBy: event.target.value })}>
              <option value="dealScore">Best ranked</option>
              <option value="discount">Biggest discount</option>
              <option value="popularity">Popularity</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          <ProductFilter 
            categories={categories}
            onFilterUpdate={handleFilterUpdate}
            initialFilters={filters}
          />
        </div>

        <div className={styles.productsGrid}>
          {filteredProducts.map((product) => (
            product.activeDealId ? (
              <DealCard key={product._id} product={product} section="category-page" />
            ) : <div key={product._id} className={styles.productCard}>
              <div className={styles.productImage}>
                {/* Heart Button */}
                <button
                   className={styles.heartButton}
                   onClick={() => handleWishlistToggle(product._id)}>
                   {wishlistedProducts.has(product._id) ? <FaHeart /> :<CiHeart /> }
                   
                </button>
                {/* Heart Button End    '❤️' '♡'*/}
                {/* Share button start */}
                <button onClick={() => handleShareProduct(product._id)} className={styles.shareButton}>
                <FaShare />

                  </button>
                  {/* share button end */}

                {product.images && product.images[0] ? (
                  <img src={product.images[0].url} alt={product.title} />
                ) : (
                  <img src="/placeholder-image.jpg" alt={product.title} />
                )}
                
              </div>
              
              <div className={styles.productInfo}>
                <h3>{product.title}</h3>
                <div className={styles.priceInfo}>
                  <span className={styles.salePrice}>${product.salePrice}</span>
                  <span className={styles.listPrice}>${product.listPrice}</span>
                  <span className={styles.discount}>
                    {Math.round(100 - (product.salePrice / product.listPrice) * 100)}% OFF
                  </span>
                </div>
                <p className={styles.store}>From: {product.store}</p>
                <div className={styles.actions}>
                  <Link
                    to={`/products/${product._id}`}
                    className={styles.viewDetailsButton}
                  >
                    View Details
                  </Link>
    {/* heart button place */}
  {/* Share button place */}
                  {/* <a
                    href={product.dealUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.dealLink}
                  >
                    View Deal
                  </a> */}
                  
                  <button
  onClick={() => handleViewDeal(product._id, product.dealUrl)}
  className={styles.dealLink}
    target="_blank"
                    rel="noopener noreferrer"
>
  View Deal
</button>
                  <div className={styles.ratingButtons}>
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;

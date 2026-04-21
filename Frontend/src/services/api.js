import axios from 'axios';

const CSRF_HEADER_NAME = 'x-csrf-token';
let csrfToken = null;

const setCsrfToken = (token) => {
    csrfToken = token || null;
};

// Initialize Axios instance
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    withCredentials: true,
});

// Flag to prevent infinite logout loops
let isLoggingOut = false;

api.interceptors.request.use((config) => {
    const method = String(config.method || 'GET').toUpperCase();
    const isUnsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (isUnsafe && csrfToken) {
        config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor for global error handling
api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthProbe = requestUrl.includes('/auth/me') || requestUrl.includes('/auth/csrf');
    const isAuthRoute = window.location.pathname === '/auth';

    // Only handle 401 errors if we're not already logging out and it's not a sign-in or signout attempt
    if (error.response?.status === 401 && 
        !isLoggingOut && 
        !isAuthProbe &&
        !isAuthRoute &&
        !requestUrl.includes('/auth/signin') &&
        !requestUrl.includes('/auth/signout')) {
        
        isLoggingOut = true;
        try {
            await signOut();
            window.history.pushState({}, '', '/auth');
            window.dispatchEvent(new PopStateEvent('popstate'));
        } finally {
            isLoggingOut = false;
        }
    }
    return Promise.reject(error);
});

export const fetchCsrfToken = async () => {
    const response = await api.get('/auth/csrf');
    setCsrfToken(response.data?.csrfToken);
    return response.data?.csrfToken;
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

// Authentication Services
export const signIn = async (email, password) => {
    try {
        const response = await api.post('/auth/signin', { email, password });
        await fetchCsrfToken();
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Invalid email or password');
        }
        throw new Error(error.response?.data?.message || 'An error occurred during sign in');
    }
};

export const signUp = async (email, password, username, confirmPassword) => {
    try {
        const response = await api.post('/auth/signup', { email, password, username, confirmPassword });
        await fetchCsrfToken();
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'An error occurred during sign up');
    }
};

export const signOut = async () => {
    isLoggingOut = true; // Set flag before making the request
    try {
        await api.post('/auth/signout');
    } catch (error) {
        console.log('Signout API error:', error);
    } finally {
        setCsrfToken(null);
        isLoggingOut = false; // Reset flag
    }
};

export const getProductsApproved = async (filters) => {
    try {
      const queryParams = {
        ...(filters.categories && { categories: filters.categories }),
        ...(filters.priceRange && {
          min: filters.priceRange.min,
          max: filters.priceRange.max
        }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
     
      };
  
      console.log('Prepared Query Params:', queryParams);
      const response = await api.get('/products/approved', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Get Products Error:', error.message);
      throw error;
    }
  };

  export const getUserProducts = async (createdBy) => {
    try {
      const response = await api.get(`/products/userProducts/${createdBy}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user products:', error.response ? error.response.data : error);
      throw error;
    }
  };
  
// Product Services
export const getProducts = async (filters) => {
    try {
      console.log('Full Filters Object:', filters);
  
      const queryParams = {
        ...(filters.categories && filters.categories.length > 0 
          ? { categories: filters.categories.join(',') } 
          : {}),
        ...(filters.priceRange && filters.priceRange.min !== undefined 
          ? { min: filters.priceRange.min } 
          : {}),
        ...(filters.priceRange && filters.priceRange.max !== undefined 
          ? { max: filters.priceRange.max } 
          : {}),
        ...(filters.status && { status: filters.status })
      };
  
      console.log('Prepared Query Params:', queryParams);
  
      const response = await api.get('/products/pending', { params: queryParams });
  
      console.log('Filtered Products:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get Products Error:', error.message);
      throw error;
    }
  };
  
  export const incrementProductView = async (productId) => {
    try {
        console.log('Attempting to increment view for product:', productId);
        const response = await api.patch(`/products/${productId}/view`);
        console.log('View increment response:', response);
        return response;
    } catch (error) {
        console.error('Error incrementing view:', error.response || error);
        throw error;
    }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await api.put(`/users/${userId}`, profileData);
    const data = response.data;
    
    // Update the stored user data in localStorage
    const currentUserData = JSON.parse(localStorage.getItem('user'));
    if (currentUserData) {
      const updatedUserData = {
        ...currentUserData,
        username: profileData.username,
        email: profileData.email,
        gender: profileData.gender,
        country: profileData.country
      };
      localStorage.setItem('user', JSON.stringify(updatedUserData));
    }
    
    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

export const getProductById = async (id) => {
    try {
        const response = await api.get(`/products/${id}`);
        // Add error logging to debug description issues
        console.log('Product Data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Get Product Error:', error.response?.data?.message || error.message);
        throw error;
    }
};

export const getProductPriceHistory = async (id, days = 30) => {
    const response = await api.get(`/products/${id}/price-history`, { params: { days } });
    return response.data;
};

export const getActiveDeals = async (filters = {}) => {
    const response = await api.get('/deals/active', { params: filters });
    return response.data;
};

export const getDealRedirectUrl = (dealId, metadata = {}) => {
    const baseUrl = api.defaults.baseURL || '';
    const rootUrl = baseUrl.replace(/\/api\/?$/, '');
    const params = new URLSearchParams(metadata);
    const query = params.toString();
    return `${rootUrl}/go/${dealId}${query ? `?${query}` : ''}`;
};

export const getAffiliateAnalyticsOverview = async (filters = {}) => {
    const response = await api.get('/analytics/affiliate/overview', { params: filters });
    return response.data;
};

export const getAdminOpsOverview = async () => {
    const response = await api.get('/admin-ops/overview');
    return response.data;
};

export const updateAdminDealStatus = async (dealId, payload) => {
    const response = await api.patch(`/admin-ops/deals/${dealId}/status`, payload);
    return response.data;
};

export const validateAdminAffiliateLink = async (dealId) => {
    const response = await api.post(`/admin-ops/deals/${dealId}/validate-link`);
    return response.data;
};

export const updateAdminProductControls = async (productId, payload) => {
    const response = await api.patch(`/admin-ops/products/${productId}/controls`, payload);
    return response.data;
};

export const createAdminRule = async (payload) => {
    const response = await api.post('/admin-ops/rules', payload);
    return response.data;
};

export const deleteAdminRule = async (ruleId) => {
    const response = await api.delete(`/admin-ops/rules/${ruleId}`);
    return response.data;
};

export const getPersonalizationPreferences = async () => {
    const response = await api.get('/personalization/preferences');
    return response.data;
};

export const updatePersonalizationPreferences = async (payload) => {
    const response = await api.put('/personalization/preferences', payload);
    return response.data;
};

export const getPriceAlerts = async () => {
    const response = await api.get('/personalization/alerts');
    return response.data;
};

export const createPriceAlert = async (payload) => {
    const response = await api.post('/personalization/alerts', payload);
    return response.data;
};

export const deletePriceAlert = async (alertId) => {
    const response = await api.delete(`/personalization/alerts/${alertId}`);
    return response.data;
};

export const getNotifications = async () => {
    const response = await api.get('/personalization/notifications');
    return response.data;
};

export const markNotificationRead = async (eventId) => {
    const response = await api.patch(`/personalization/notifications/${eventId}/read`);
    return response.data;
};


export const createProduct = async (formData) => {
    try {
        // Log the formData to debug
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        const response = await api.post('/products', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Add this header
            },
        });
        return response.data;
    } catch (error) {
        console.error('Create Product Error:', error.response?.data?.message || error.message);
        throw error;
    }
};

// ... previous code ...

// Interaction Services
export const approveProduct = async (productId) => {
    return await api.put(`/products/${productId}/update/approved`);
  };
  
  export const rejectProduct = async (productId) => {
    return await api.put(`/products/${productId}/update/rejected`);
  };
  
  // ... other code ...
export const getWishlist = async () => {
    try {
      const response = await api.get('/wishlist');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch wishlist');
    }
  };

export const addToWishlist = async (productId) => {
    try {
      const response = await api.post(`/wishlist/add`, { productId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add to wishlist');
    }
  };
  
  export const removeFromWishlist = async (productId) => {
    try {
      const response = await api.delete(`/wishlist/${productId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove from wishlist');
    }
  };

// Interaction Services
export const toggleLike = async (productId) => {
    try {
        const response = await api.put(`/products/${productId}/like`);
        return response.data;
    } catch (error) {
        console.error('Toggle Like Error:', error.response?.data?.message || error.message);
        throw error;
    }
};

export const toggleDislike = async (productId) => {
    try {
        const response = await api.put(`/products/${productId}/dislike`);
        return response.data;
    } catch (error) {
        console.error('Toggle Dislike Error:', error.response?.data?.message || error.message);
        throw error;
    }
};

export const updateProductRating = async (productId, { action, userId }) => {
    try {
        const response = await api.post(`/products/${productId}/rating`, {
            action,
            userId,
        });
        return response.data;
    } catch (error) {
        console.error('Update Rating Error:', error.response?.data?.message || error.message);
        throw error;
    }
};
// services/api.js

export const updateProduct = async (productId, productDetails) => {
  try {
      const response = await api.put(`/products/${productId}`, productDetails);
      return response.data;
  } catch (error) {
      console.error('Update Product Error:', error.response?.data?.message || error.message);
      throw error;
  }
};

export const deleteProduct = async (productId) => {
    const token = localStorage.getItem("token"); 
    return await api.delete(`/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
};


export default api;

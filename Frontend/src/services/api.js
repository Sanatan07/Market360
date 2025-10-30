import axios from 'axios';

// Initialize Axios instance
const api = axios.create({
    baseURL:  'https://market360-backend-t1er.onrender.com/api',
    timeout: 10000,
});

// Flag to prevent infinite logout loops
let isLoggingOut = false;

// Request interceptor for authorization heade
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor for global error handling
api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    // Only handle 401 errors if we're not already logging out and it's not a sign-in or signout attempt
    if (error.response?.status === 401 && 
        !isLoggingOut && 
        !error.config.url.includes('/auth/signin') &&
        !error.config.url.includes('/auth/signout')) {
        
        isLoggingOut = true;
        try {
            await signOut();
            window.location.href = '/auth'; // Redirect to auth page instead of reload
        } finally {
            isLoggingOut = false;
        }
    }
    return Promise.reject(error);
});

// Authentication Services
export const signIn = async (email, password) => {
    try {
        const response = await api.post('/auth/signin', { email, password });
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
        localStorage.removeItem('token');
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
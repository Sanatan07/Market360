import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProducts, updateProduct, updateUserProfile } from '../services/api';
import { Pencil, Eye, EyeOff, Save, X } from 'lucide-react';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    gender: '',
    country: '',
    currentPassword: '',
    newPassword: '',
    retypeNewPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { currentUser } = useAuth();
  const [userProducts, setUserProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Books',
    'Sports & Outdoors', 'Toys & Games', 'Beauty', 'Automotive'
  ];

  // Load user data into form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        fullName: currentUser.username || '',
        email: currentUser.email || '',
        gender: currentUser.gender || '',
        country: currentUser.country || '',
      }));
    }
  }, [currentUser]);

  // Update checks to use currentUser.id
  const fetchUserProducts = useCallback(async () => {
    if (!currentUser || !currentUser.id) return;

    try {
      const products = await getUserProducts(currentUser.id);
      setUserProducts(products);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [currentUser]);

  // Update useEffect dependency condition
  useEffect(() => {
    if (currentUser && currentUser.id) {  // Use currentUser.id
      console.log('User ID:', currentUser.id);  // Updated
      fetchUserProducts();
    } else {
      console.log('No user or user ID available');
    }
  }, [currentUser, fetchUserProducts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'newPassword') {
      validatePassword(value);
    }
  };

  const validatePassword = (password) => {
    const requirements = [
      { test: /.{16,}/, message: "At least 16 characters" },
      { test: /[a-z]/, message: "One lowercase letter" },
      { test: /[A-Z]/, message: "One uppercase letter" },
      { test: /\d/, message: "One number" },
      { test: /[!@#$%^&*]/, message: "One special character" }
    ];

    const failedRequirements = requirements
      .filter(req => !req.test.test(password))
      .map(req => req.message);

    setPasswordError(failedRequirements.length ? failedRequirements.join(', ') : '');
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await updateProduct(editingProduct._id, editingProduct);
      await fetchUserProducts();
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to update product:', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.id) return;

    try {
      // Handle password change if entered
      const profileData = {
        username: formData.fullName,
        email: formData.email,
        gender: formData.gender,
        country: formData.country
      };

      if (formData.newPassword && formData.currentPassword && formData.newPassword === formData.retypeNewPassword) {
        profileData.currentPassword = formData.currentPassword;
        profileData.newPassword = formData.newPassword;
      }

      await updateUserProfile(currentUser.id, profileData);
      setEditMode(false);
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        retypeNewPassword: ''
      }));
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'profile' ? styles.active : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'products' ? styles.active : ''}`}
          onClick={() => setActiveTab('products')}
        >
          My Products
        </button>
      </div>

      <div className={styles.contentContainer}>
        {activeTab === 'profile' && (
          <div className={styles.profileSection}>
            <div className={styles.profileHeader}>
              <div className={styles.profileImage}>
                <img src="/api/placeholder/120/120" alt="Profile" />
                {editMode ? null : (
                  <button 
                    className={styles.imageEditButton}
                    onClick={() => setEditMode(true)}
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              <div className={styles.headerContent}>
                <h2 className={styles.userName}>{formData.fullName || 'Your Name'}</h2>
                {editMode ? (
                  <div className={styles.editModeControls}>
                    <button 
                      className={styles.editModeButton} 
                      onClick={() => setEditMode(false)}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    className={styles.editProfileButton}
                    onClick={() => setEditMode(true)}
                  >
                    <Pencil size={16} /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            <form className={styles.profileForm} onSubmit={handleSaveProfile}>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={!editMode ? styles.disabledInput : ''}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={!editMode ? styles.disabledInput : ''}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Gender</label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={!editMode ? styles.disabledInput : ''}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Country</label>
                  <select 
                    name="country" 
                    value={formData.country} 
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={!editMode ? styles.disabledInput : ''}
                  >
                    <option value="">Select Country</option>
                    <option value="us">United States</option>
                    <option value="uk">United Kingdom</option>
                    <option value="ca">Canada</option>
                  </select>
                </div>
              </div>

              {editMode && (
                <div className={styles.passwordSection}>
                  <h3>Change Password</h3>
                  <div className={styles.passwordFields}>
                    <div className={styles.inputGroup}>
                      <label>Current Password</label>
                      <div className={styles.passwordInput}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={styles.passwordToggle}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                      />
                      {passwordError && <span className={styles.errorText}>{passwordError}</span>}
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Confirm New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="retypeNewPassword"
                        value={formData.retypeNewPassword}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editMode && (
                <button type="submit" className={styles.saveButton}>
                  <Save size={16} /> Save Changes
                </button>
              )}
            </form>
          </div>
        )}
        {activeTab === 'products' && (
          <div className={styles.productsSection}>
            <div className={styles.productsTableContainer}>
              <table className={styles.productsTable}>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                {userProducts.map(product => (
                  <tr key={product._id} className={styles.productRow}>
                    <td className={styles.imageCell}>
                      <img 
                        src={product.images?.length ? product.images[0].url : '/fallback-image.jpg'}
                        alt={product.title || 'Product'}
                        className={styles.productImage}
                      />
                    </td>
                    <td>{product.title}</td>
                    <td className={styles.descriptionCell}>{product.description?.substring(0, 100)}...</td>
                    <td>${product.salePrice}</td>
                    <td>{product.category}</td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.editButton}
                        onClick={() => setEditingProduct(product)}
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>

            {editingProduct && (
              <div className={styles.editOverlay}>
                <div className={styles.editForm}>
                  <h3>Edit Product</h3>
                  <form onSubmit={handleEditProduct}>
                    <div className={styles.inputGroup}>
                      <label>Title</label>
                      <input
                        type="text"
                        value={editingProduct.title}
                        onChange={e => setEditingProduct({
                          ...editingProduct,
                          title: e.target.value
                        })}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Description</label>
                      <textarea
                        value={editingProduct.description}
                        onChange={e => setEditingProduct({
                          ...editingProduct,
                          description: e.target.value
                        })}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingProduct.salePrice}
                        onChange={e => setEditingProduct({
                          ...editingProduct,
                          salePrice: e.target.value
                        })}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Category</label>
                      <select
                        value={editingProduct.category}
                        onChange={e => setEditingProduct({
                          ...editingProduct,
                          category: e.target.value
                        })}
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.editActions}>
                      <button type="submit" className={styles.saveButton}>
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => setEditingProduct(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
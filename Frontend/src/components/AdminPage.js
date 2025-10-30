import { useEffect, useState } from 'react';
import { approveProduct, rejectProduct, deleteProduct, updateProduct , getProducts, getProductsApproved} from '../services/api';
import toast from 'react-hot-toast';
import styles from './AdminPage.module.css';

const AdminPage = () => {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [analyticsProducts, setAnalyticsProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [editingProduct, setEditingProduct] = useState(false);
  const [editForm, setEditForm] = useState({
    _id: '',
    dealUrl: '',
    title: '',
    salePrice: '',
    listPrice: '',
    description: '',
    category: '',
    store: ''
  });

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Books',
    'Sports & Outdoors', 'Toys & Games', 'Beauty', 'Automotive'
  ];

  useEffect(() => {
    fetchPendingProducts();
    fetchApprovedProducts();
    fetchAnalyticsProducts();
  }, []);

  const fetchPendingProducts = async () => {
    try {
      const products = await getProducts({ status: 'pending' });
      setPendingProducts(products);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsProducts = async () => {
    try {
      // Modified to explicitly request only title and viewCount, sorted by viewCount
      const products = await getProductsApproved({
        select: 'title viewCount', // Only fetch required fields
        sortBy: 'viewCount',
        order: 'desc',
        limit: 10
      });
      
      // Sort the products array by viewCount in descending order
      const sortedProducts = products.sort((a, b) => b.viewCount - a.viewCount);
      setAnalyticsProducts(sortedProducts);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load analytics data');
    }
  };

  const fetchApprovedProducts = async () => {
    try {
      const products = await getProductsApproved({ status: 'approved' });
      setApprovedProducts(products);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load approved products');
    }
  };

  // const fetchAnalyticsProducts = async () => {
  //   try {
  //     const products = await getProducts({ sortBy: 'viewCount', order: 'desc', limit: 10 });
  //     setAnalyticsProducts(products);
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || 'Failed to load analytics data');
  //   }
  // };

  const handleApprove = async (id) => {
    try {
      await approveProduct(id);
      await fetchPendingProducts();
      await fetchApprovedProducts();
      toast.success('Product approved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve product');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectProduct(id);
      await fetchPendingProducts();
      toast.success('Product rejected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject product');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      await fetchPendingProducts();
      await fetchApprovedProducts();
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleEdit = (product) => {
    setEditForm({
      _id: product._id,
      dealUrl: product.dealUrl,
      title: product.title,
      salePrice: product.salePrice,
      listPrice: product.listPrice,
      description: product.description,
      category: product.category,
      store: product.store
    });
    setEditingProduct(true);
  };

  const handleEditChange = (e, field) => {
    setEditForm({
      ...editForm,
      [field]: e.target.value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const productId = editForm._id;
      const updatedData = {
        dealUrl: editForm.dealUrl,
        title: editForm.title,
        salePrice: parseFloat(editForm.salePrice),
        listPrice: parseFloat(editForm.listPrice),
        description: editForm.description,
        category: editForm.category,
        store: editForm.store
      };
      await updateProduct(productId, updatedData);
      await fetchPendingProducts();
      await fetchApprovedProducts();
      toast.success('Product updated successfully');
      setEditingProduct(false);
      setEditForm({});
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  };

  const renderProductTable = (products, isPending) => (
    <table className={styles.productsTable}>
      <thead>
        <tr>
          <th>Thumbnail</th>
          <th>Title</th>
          <th>View Count</th>
          <th>Description</th>
          <th>Sale Price</th>
          <th>List Price</th>
          <th>Store</th>
          <th>Created At</th>
          <th>Creator</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map(product => (
          <tr key={product._id}>
            <td className={styles.imageCell}>
              <img 
                src={product.images?.[0]?.url || 'https://example.com/placeholder.png'}
                alt={product.title || 'No Image'}
                className={styles.productImage}
              />
            </td>
            <td>{product.title}</td>
            <td>{product.viewCount}</td>
            <td>{product.description.substring(0, 100)}...</td>
            <td>${product.salePrice}</td>
            <td>${product.listPrice}</td>
            <td>{product.store}</td>
            <td>{new Date(product.createdAt).toLocaleString()}</td>
            <td>{product.createdBy?.username || 'User Unknown'}</td>
            <td className={styles.actionsCell}>
              {isPending ? (
                <>
                  <button onClick={() => handleApprove(product._id)} className={styles.approveButton}>Approve</button>
                  <button onClick={() => handleReject(product._id)} className={styles.rejectButton}>Reject</button>
                </>
              ) : (
                <button onClick={() => handleDelete(product._id)} className={styles.deleteButton}>Delete</button>
              )}
              <button onClick={() => handleEdit(product)} className={styles.editButton}>Edit</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>
      <div className={styles.tabNav}>
        {['pending', 'approved', 'Performance of'].map(tab => (
          <button 
            key={tab} 
            className={`${styles.tabButton} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Products
          </button>
        ))}
      </div>
      {editingProduct ? (
        <div className={styles.editFormOverlay}>
          <div className={styles.editFormContainer}>
            <h3 className={styles.editFormTitle}>Edit Product</h3>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGroup}>
                <label>Deal URL:</label>
                <input
                  type="url"
                  value={editForm.dealUrl}
                  onChange={(e) => handleEditChange(e, 'dealUrl')}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Title:</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => handleEditChange(e, 'title')}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Sale Price:</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.salePrice}
                  onChange={(e) => handleEditChange(e, 'salePrice')}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>List Price:</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.listPrice}
                  onChange={(e) => handleEditChange(e, 'listPrice')}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description:</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => handleEditChange(e, 'description')}
                  rows="4"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Category:</label>
                <select
                  value={editForm.category}
                  onChange={(e) => handleEditChange(e, 'category')}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Store:</label>
                <input
                  type="text"
                  value={editForm.store}
                  onChange={(e) => handleEditChange(e, 'store')}
                  required
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveButton}>Save Changes</button>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setEditingProduct(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {activeTab === 'pending' ? renderProductTable(pendingProducts, true) : null}
      {activeTab === 'approved' ? renderProductTable(approvedProducts, false) : null}
      {activeTab === 'Performance of' && (
        <div className={styles.analyticsSection}>
          <h2>Top Viewed Products</h2>
          <table className={styles.analyticsTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Title</th>
                <th>View Count</th>
              </tr>
            </thead>
            <tbody>
              {analyticsProducts.map((product, index) => (
                <tr key={product._id}>
                  <td>{index + 1}</td>
                  <td>{product.title}</td>
                  <td>{product.viewCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
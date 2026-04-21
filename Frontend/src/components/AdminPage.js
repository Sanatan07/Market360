import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createAdminRule,
  deleteAdminRule,
  getAdminOpsOverview,
  getAffiliateAnalyticsOverview,
  updateAdminDealStatus,
  updateAdminProductControls,
  validateAdminAffiliateLink
} from '../services/api';
import styles from './AdminPage.module.css';

const categories = [
  'electronics',
  'mobiles-accessories',
  'computers',
  'audio',
  'kitchen-appliances',
  'home-living',
  'fashion',
  'beauty-personal-care',
  'toys-books',
  'fitness-sports',
  'automotive'
];

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Never';

const AdminPage = () => {
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('operations');
  const [ruleForm, setRuleForm] = useState({ type: 'brand-blacklist', value: '', replacementValue: '', reason: '' });

  const loadData = async () => {
    try {
      const [ops, affiliateAnalytics] = await Promise.all([
        getAdminOpsOverview(),
        getAffiliateAnalyticsOverview()
      ]);
      setOverview(ops);
      setAnalytics(affiliateAnalytics);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load admin console');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDealStatus = async (dealId, status, reason) => {
    try {
      await updateAdminDealStatus(dealId, { status, reason });
      toast.success(`Deal marked ${status}`);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update deal');
    }
  };

  const handleFeature = async (productId, isFeatured) => {
    try {
      await updateAdminProductControls(productId, { isFeatured });
      toast.success(isFeatured ? 'Featured on homepage' : 'Removed from homepage picks');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  };

  const handleCategoryOverride = async (productId, category) => {
    try {
      await updateAdminProductControls(productId, { category });
      toast.success('Category overridden');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to override category');
    }
  };

  const handleValidateLink = async (dealId) => {
    try {
      const result = await validateAdminAffiliateLink(dealId);
      toast.success(result.valid ? 'Affiliate link looks valid' : 'Invalid link hidden');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to validate link');
    }
  };

  const handleCreateRule = async (event) => {
    event.preventDefault();
    try {
      await createAdminRule(ruleForm);
      toast.success('Admin rule saved');
      setRuleForm({ type: 'brand-blacklist', value: '', replacementValue: '', reason: '' });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rule');
    }
  };

  const renderSyncStatus = () => (
    <section className={styles.panel}>
      <h2>Sync Status by Source</h2>
      <div className={styles.statusGrid}>
        {(overview?.syncBySource || []).map((row) => (
          <div key={row._id} className={styles.statusCard}>
            <strong>{row._id}</strong>
            <span>Status: {row.lastRun?.status}</span>
            <span>Last run: {formatDate(row.lastRun?.startedAt)}</span>
            <span>Inserted: {row.lastRun?.insertedCount || 0}</span>
            <span>Updated: {row.lastRun?.updatedCount || 0}</span>
            <span>Failed runs: {row.failedRuns}</span>
          </div>
        ))}
      </div>
      <div className={styles.statusGrid}>
        <div className={styles.statusCard}>
          <strong>Last Amazon success</strong>
          <span>{formatDate(overview?.lastSuccessfulImport?.amazon?.finishedAt)}</span>
        </div>
        <div className={styles.statusCard}>
          <strong>Last Flipkart success</strong>
          <span>{formatDate(overview?.lastSuccessfulImport?.flipkart?.finishedAt)}</span>
        </div>
      </div>
    </section>
  );

  const renderDealTable = (title, deals, isHidden) => (
    <section className={styles.panel}>
      <h2>{title}</h2>
      <div className={styles.tableWrap}>
        <table className={styles.productsTable}>
          <thead>
            <tr>
              <th>Deal</th>
              <th>Source</th>
              <th>Category</th>
              <th>Score</th>
              <th>Reasons</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(deals || []).map((deal) => (
              <tr key={deal._id}>
                <td>{deal.productId?.title || deal._id}</td>
                <td>{deal.source}</td>
                <td>
                  <select
                    value={deal.productId?.category || ''}
                    onChange={(event) => handleCategoryOverride(deal.productId?._id, event.target.value)}
                  >
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </td>
                <td>{deal.dealScore}</td>
                <td>{deal.qualification?.hiddenReasons?.join(', ') || 'None'}</td>
                <td className={styles.actionsCell}>
                  <button className={styles.approveButton} onClick={() => handleDealStatus(deal._id, 'active', 'manual-operator-restore')}>Restore</button>
                  {!isHidden && <button className={styles.rejectButton} onClick={() => handleDealStatus(deal._id, 'hidden', 'manual-operator-hide')}>Hide</button>}
                  <button className={styles.editButton} onClick={() => handleFeature(deal.productId?._id, !deal.productId?.isFeatured)}>
                    {deal.productId?.isFeatured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button className={styles.saveButton} onClick={() => handleValidateLink(deal._id)}>Validate Link</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderFailedItems = () => (
    <section className={styles.panel}>
      <h2>Failed Items and Sync Errors</h2>
      <div className={styles.tableWrap}>
        <table className={styles.productsTable}>
          <thead>
            <tr>
              <th>Source</th>
              <th>Type</th>
              <th>Status</th>
              <th>Category</th>
              <th>Failed</th>
              <th>Error</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {(overview?.failedItems || []).map((log) => (
              <tr key={log._id}>
                <td>{log.source}</td>
                <td>{log.syncType}</td>
                <td>{log.status}</td>
                <td>{log.category || '-'}</td>
                <td>{log.failedCount}</td>
                <td>{log.errorMessage || log.metadata?.errors?.join(', ') || '-'}</td>
                <td>{formatDate(log.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderRules = () => (
    <section className={styles.panel}>
      <h2>Blacklists and Category Mapping Overrides</h2>
      <form className={styles.ruleForm} onSubmit={handleCreateRule}>
        <select value={ruleForm.type} onChange={(event) => setRuleForm({ ...ruleForm, type: event.target.value })}>
          <option value="brand-blacklist">Blacklist brand</option>
          <option value="product-blacklist">Blacklist product</option>
          <option value="category-override">Category override</option>
        </select>
        <input placeholder="Value or product id" value={ruleForm.value} onChange={(event) => setRuleForm({ ...ruleForm, value: event.target.value })} required />
        <input placeholder="Replacement category" value={ruleForm.replacementValue} onChange={(event) => setRuleForm({ ...ruleForm, replacementValue: event.target.value })} />
        <input placeholder="Reason" value={ruleForm.reason} onChange={(event) => setRuleForm({ ...ruleForm, reason: event.target.value })} />
        <button className={styles.saveButton} type="submit">Save Rule</button>
      </form>
      <div className={styles.ruleList}>
        {(overview?.rules || []).map((rule) => (
          <div key={rule._id} className={styles.ruleItem}>
            <span><strong>{rule.type}</strong>: {rule.value}</span>
            {rule.replacementValue && <span>→ {rule.replacementValue}</span>}
            <button className={styles.rejectButton} onClick={() => deleteAdminRule(rule._id).then(loadData)}>Disable</button>
          </div>
        ))}
      </div>
    </section>
  );

  const renderAnalytics = () => (
    <section className={styles.panel}>
      <h2>Click Analytics Dashboard</h2>
      <div className={styles.statusGrid}>
        {(analytics?.clicksBySource || []).map((row) => (
          <div key={row._id} className={styles.statusCard}>
            <strong>{row._id || 'unknown'}</strong>
            <span>{row.clicks} clicks</span>
          </div>
        ))}
        {(analytics?.topEarningCategories || []).slice(0, 4).map((row) => (
          <div key={row._id} className={styles.statusCard}>
            <strong>{row._id || 'unknown category'}</strong>
            <span>{row.clicks} clicks</span>
            <span>Est. ₹{Math.round(row.estimatedCommission || 0)}</span>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Market360 Operator Console</h1>
      <div className={styles.tabNav}>
        {['operations', 'deals', 'rules', 'analytics'].map((tab) => (
          <button key={tab} className={`${styles.tabButton} ${activeTab === tab ? styles.active : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'operations' && (
        <>
          {renderSyncStatus()}
          {renderFailedItems()}
        </>
      )}
      {activeTab === 'deals' && (
        <>
          {renderDealTable('Stale Deals', overview?.staleDeals || [], false)}
          {renderDealTable('Hidden Deals', overview?.hiddenDeals || [], true)}
        </>
      )}
      {activeTab === 'rules' && renderRules()}
      {activeTab === 'analytics' && renderAnalytics()}
    </div>
  );
};

export default AdminPage;

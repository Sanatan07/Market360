export const formatINR = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getDiscount = (product) => {
  if (product?.discountPercent) return Math.round(product.discountPercent);
  if (!product?.salePrice || !product?.listPrice) return 0;
  return Math.max(0, Math.round(((product.listPrice - product.salePrice) / product.listPrice) * 100));
};

export const verifiedAgo = (dateValue) => {
  if (!dateValue) return 'verification pending';
  const diffMins = Math.max(1, Math.round((Date.now() - new Date(dateValue).getTime()) / 60000));
  if (diffMins < 60) return `verified ${diffMins} min ago`;
  const hours = Math.round(diffMins / 60);
  if (hours < 24) return `verified ${hours} hr ago`;
  return `verified ${Math.round(hours / 24)} d ago`;
};
export const sourceLabel = (source) => {
  if (source === 'flipkart') return 'Flipkart';
  return 'Market360';
};

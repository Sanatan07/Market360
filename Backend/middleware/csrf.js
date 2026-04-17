const crypto = require('crypto');

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const csrfSecret = () => process.env.CSRF_SECRET || process.env.JWT_SECRET;

const sign = (value) =>
  crypto.createHmac('sha256', csrfSecret()).update(value).digest('hex');

const issueCsrfToken = (req, res) => {
  const ts = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${ts}.${nonce}`;
  const sig = sign(payload);
  res.json({ csrfToken: `${payload}.${sig}` });
};

// Header-based CSRF protection for cookie-authenticated requests.
const requireCsrf = (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  const isUnsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!isUnsafe) return next();

  // If no auth cookie is present, CSRF is not relevant yet (e.g. signup/signin).
  if (!req.cookies?.access_token) return next();

  const token = req.headers?.[CSRF_HEADER_NAME];
  if (!token || typeof token !== 'string') {
    return res.status(403).json({ message: 'CSRF token missing' });
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return res.status(403).json({ message: 'CSRF token invalid' });
  }

  const [ts, nonce, sig] = parts;
  const payload = `${ts}.${nonce}`;
  if (sign(payload) !== sig) {
    return res.status(403).json({ message: 'CSRF token invalid' });
  }

  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > CSRF_TTL_MS) {
    return res.status(403).json({ message: 'CSRF token expired' });
  }

  next();
};

module.exports = {
  issueCsrfToken,
  requireCsrf,
  CSRF_HEADER_NAME,
};


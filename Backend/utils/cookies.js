const isProd = () => process.env.NODE_ENV === 'production';

const parseBooleanEnv = (value, fallback) => {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

const cookieSecure = () => {
  // Render/Vercel: you typically want Secure cookies in production.
  return parseBooleanEnv(process.env.COOKIE_SECURE, isProd());
};

const cookieSameSite = () => {
  const value = (process.env.COOKIE_SAMESITE || (isProd() ? 'none' : 'lax')).toLowerCase();
  if (value === 'lax' || value === 'strict' || value === 'none') return value;
  return isProd() ? 'none' : 'lax';
};

const authCookieOptions = () => ({
  httpOnly: true,
  secure: cookieSecure(),
  sameSite: cookieSameSite(),
  path: '/',
});

module.exports = {
  authCookieOptions,
};


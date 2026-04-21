const crypto = require('crypto');

const generateSecret = (bytes = 64) => crypto.randomBytes(bytes).toString('hex');

const generateAuthSecrets = () => ({
  JWT_SECRET: generateSecret(),
  CSRF_SECRET: generateSecret()
});

if (require.main === module) {
  const secrets = generateAuthSecrets();
  console.log(`JWT_SECRET=${secrets.JWT_SECRET}`);
  console.log(`CSRF_SECRET=${secrets.CSRF_SECRET}`);
}

module.exports = {
  generateAuthSecrets,
  generateSecret
};

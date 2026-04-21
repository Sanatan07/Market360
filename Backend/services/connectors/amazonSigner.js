const crypto = require('crypto');

const hash = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const hmac = (key, value, encoding) => crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);

const toAmzDate = (date = new Date()) => date.toISOString().replace(/[:-]|\.\d{3}/g, '');
const toDateStamp = (amzDate) => amzDate.slice(0, 8);

const getSignatureKey = (secretKey, dateStamp, region, service) => {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
};

const signPaApiRequest = ({ accessKey, secretKey, region, host, path, target, payload }) => {
  const service = 'ProductAdvertisingAPI';
  const amzDate = toAmzDate();
  const dateStamp = toDateStamp(amzDate);
  const payloadString = JSON.stringify(payload);
  const canonicalHeaders = [
    `content-encoding:amz-1.0`,
    `content-type:application/json; charset=utf-8`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${target}`
  ].join('\n') + '\n';
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const canonicalRequest = [
    'POST',
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    hash(payloadString)
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest)
  ].join('\n');
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign, 'hex');

  return {
    payloadString,
    headers: {
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=utf-8',
      Host: host,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': target,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    }
  };
};

module.exports = {
  signPaApiRequest
};

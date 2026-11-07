const jwtSecret = process.env.JWT_SECRET;

if (typeof jwtSecret !== 'string' || Buffer.byteLength(jwtSecret.trim(), 'utf8') < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 bytes of random secret material');
}

module.exports = { jwtSecret };

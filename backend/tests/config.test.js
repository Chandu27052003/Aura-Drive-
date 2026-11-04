const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const originalSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  jest.resetModules();
});

test.each([undefined, '', '   ', 'too-short', 'a'.repeat(31), `  ${'a'.repeat(31)}  `])(
  'startup configuration rejects a missing or short signing key: %j', secret => {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    jest.resetModules();
    expect(() => require('../src/config')).toThrow('JWT_SECRET must be configured');
  }
);

test('startup configuration uses the explicitly configured signing key', () => {
  const secret = crypto.randomBytes(32).toString('hex');
  process.env.JWT_SECRET = secret;
  jest.resetModules();
  expect(require('../src/config').jwtSecret).toBe(secret);
});

test('startup configuration accepts the 32-byte minimum', () => {
  process.env.JWT_SECRET = crypto.randomBytes(24).toString('base64');
  expect(Buffer.byteLength(process.env.JWT_SECRET)).toBe(32);
  jest.resetModules();
  expect(require('../src/config').jwtSecret).toBe(process.env.JWT_SECRET);
});

test.each([undefined, 'too-short'])('the API fails closed before opening a database with key %j', secret => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-drive-startup-'));
  const database = path.join(directory, 'must-not-exist.sqlite');
  const env = { ...process.env, DB_PATH: database };
  if (secret === undefined) delete env.JWT_SECRET;
  else env.JWT_SECRET = secret;
  try {
    const result = spawnSync(process.execPath, ['src/server.js'], {
      cwd: path.join(__dirname, '..'), env, encoding: 'utf8', timeout: 5000
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JWT_SECRET must be configured');
    expect(fs.existsSync(database)).toBe(false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

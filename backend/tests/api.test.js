const crypto = require('crypto');

// Never run the suite against the application's persistent database or secret.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = app.locals.db;
const password = 'Test-password-123!';
const vehicle = {
  id: 'porsche-911-gt3-rs',
  make: 'Porsche',
  model: '911 GT3 RS',
  category: 'Supercar',
  price: 241300,
  quantity: 1
};

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function register(email, extra = {}) {
  return request(app).post('/api/auth/register').send({ email, password, ...extra });
}

async function login(email) {
  return request(app).post('/api/auth/login').send({ email, password });
}

describe('Car dealership authorization and inventory', () => {
  let customerToken;
  let customerId;
  let adminToken;
  let adminId;
  const mutations = [
    ['post', '/api/vehicles', { ...vehicle, id: 'new-vehicle' }],
    ['put', `/api/vehicles/${vehicle.id}`, { ...vehicle, quantity: 9 }],
    ['delete', `/api/vehicles/${vehicle.id}`, {}],
    ['post', `/api/vehicles/${vehicle.id}/restock`, { amount: 3 }]
  ];

  beforeAll(async () => {
    const customer = await register('customer@example.test');
    expect(customer.status).toBe(201);
    customerToken = customer.body.token;
    customerId = customer.body.id;

    const admin = await register('admin@example.test');
    expect(admin.status).toBe(201);
    adminId = admin.body.id;
    // Grant admin only in a trusted fixture, never through public registration.
    await run('UPDATE users SET role = ? WHERE id = ?', ['admin', adminId]);
    const adminLogin = await login('admin@example.test');
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;
  });

  beforeEach(async () => {
    await run('DELETE FROM vehicles');
    await run(
      'INSERT INTO vehicles (id, make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
      [vehicle.id, vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity]
    );
    await run('UPDATE users SET role = ? WHERE id = ?', ['admin', adminId]);
  });

  afterAll(() => new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve())));

  test.each(['admin', 'customer', 'unexpected', { admin: true }])(
    'registration ignores a caller-supplied role: %j', async role => {
      const email = `${crypto.randomUUID()}@example.test`;
      const response = await register(email, { role });
      expect(response.status).toBe(201);
      expect(response.body.role).toBe('customer');
      expect(jwt.verify(response.body.token, process.env.JWT_SECRET).role).toBe('customer');
      const signedIn = await login(email);
      expect(signedIn.status).toBe(200);
      expect(signedIn.body.role).toBe('customer');
      const denied = await request(app).post('/api/vehicles')
        .set('Authorization', `Bearer ${signedIn.body.token}`).send(vehicle);
      expect(denied.status).toBe(403);
    }
  );

  test('registration without a role creates a customer', async () => {
    const response = await register('new-customer@example.test');
    expect(response.status).toBe(201);
    expect(response.body.role).toBe('customer');
  });

  test('invalid login credentials are rejected', async () => {
    const response = await request(app).post('/api/auth/login')
      .send({ email: 'customer@example.test', password: 'wrong-password' });
    expect(response.status).toBe(401);
  });

  test('inventory listing and search remain public', async () => {
    const listing = await request(app).get('/api/vehicles');
    expect(listing.status).toBe(200);
    expect(listing.body).toEqual([expect.objectContaining(vehicle)]);
    const search = await request(app).get('/api/vehicles/search').query({ make: 'porsche' });
    expect(search.status).toBe(200);
    expect(search.body).toEqual([expect.objectContaining(vehicle)]);
  });

  test.each(mutations)('anonymous %s %s is denied', async (method, url, body) => {
    const response = await request(app)[method](url).send(body);
    expect(response.status).toBe(401);
    const listing = await request(app).get('/api/vehicles');
    expect(listing.body).toEqual([expect.objectContaining(vehicle)]);
  });

  test.each(mutations)('customer %s %s is denied without changing inventory', async (method, url, body) => {
    const response = await request(app)[method](url)
      .set('Authorization', `Bearer ${customerToken}`).send(body);
    expect(response.status).toBe(403);
    const listing = await request(app).get('/api/vehicles');
    expect(listing.body).toEqual([expect.objectContaining(vehicle)]);
  });

  test.each([
    ['an invalid signature', () => jwt.sign({ id: adminId, role: 'admin' }, 'not-the-configured-key')],
    ['an expired token', () => jwt.sign({ id: adminId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: -1 })],
    ['an unsupported algorithm', () => jwt.sign({ id: adminId, role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS384' })],
    ['a malformed token', () => 'not-a-token'],
    ['a missing user ID', () => jwt.sign({ role: 'admin' }, process.env.JWT_SECRET)],
    ['a nonexistent user', () => jwt.sign({ id: -1, role: 'admin' }, process.env.JWT_SECRET)],
    ['a customer with an admin token claim', () => jwt.sign({ id: customerId, role: 'admin' }, process.env.JWT_SECRET)]
  ])('%s cannot mutate inventory', async (_label, makeToken) => {
    const response = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${makeToken()}`).send({ ...vehicle, id: 'blocked-vehicle' });
    expect(response.status).toBe(403);
    const listing = await request(app).get('/api/vehicles');
    expect(listing.body).toEqual([expect.objectContaining(vehicle)]);
  });

  test('demoting an admin revokes inventory access for an existing token', async () => {
    await run('UPDATE users SET role = ? WHERE id = ?', ['customer', adminId]);
    for (const [method, url, body] of mutations) {
      const response = await request(app)[method](url)
        .set('Authorization', `Bearer ${adminToken}`).send(body);
      expect(response.status).toBe(403);
    }
    const listing = await request(app).get('/api/vehicles');
    expect(listing.body).toEqual([expect.objectContaining(vehicle)]);
  });

  test('deleting an admin revokes inventory access for an existing token', async () => {
    const email = 'deleted-admin@example.test';
    const created = await register(email);
    await run('UPDATE users SET role = ? WHERE id = ?', ['admin', created.body.id]);
    const signedIn = await login(email);
    await run('DELETE FROM users WHERE id = ?', [created.body.id]);
    for (const [method, url, body] of mutations) {
      const response = await request(app)[method](url)
        .set('Authorization', `Bearer ${signedIn.body.token}`).send(body);
      expect(response.status).toBe(403);
    }
    const listing = await request(app).get('/api/vehicles');
    expect(listing.body).toEqual([expect.objectContaining(vehicle)]);
  });

  test('an administrator can create, update, restock, and delete inventory', async () => {
    const id = 'admin-created-vehicle';
    const created = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`).send({ ...vehicle, id });
    expect(created.status).toBe(201);
    const updated = await request(app).put(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${adminToken}`).send({ ...vehicle, quantity: 2 });
    expect(updated.status).toBe(200);
    expect(updated.body.quantity).toBe(2);
    const restocked = await request(app).post(`/api/vehicles/${id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`).send({ amount: 3 });
    expect(restocked.status).toBe(200);
    expect(restocked.body.quantity).toBe(5);
    const deleted = await request(app).delete(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);
    const listing = await request(app).get('/api/vehicles');
    expect(listing.body.find(car => car.id === id)).toBeUndefined();
  });

  test('a customer can purchase stock but cannot buy an out-of-stock vehicle', async () => {
    const purchased = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(purchased.status).toBe(200);
    expect(purchased.body.quantity).toBe(0);
    const soldOut = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(soldOut.status).toBe(400);
  });

  test('anonymous purchases still require authentication', async () => {
    const response = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`);
    expect(response.status).toBe(401);
  });
});

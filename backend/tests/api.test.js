const request = require('supertest');
const app = require('../src/app');

describe('TDD Kata: Car Dealership Inventory REST API', () => {
  let adminToken = '';
  let vehicleId = 'porsche-911-gt3-rs';

  test('POST /api/auth/register creates an admin user and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alex Admin', email: `admin_${Date.now()}@apexmotors.io`, password: 'Password123!', role: 'admin' });
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
  });

  test('POST /api/vehicles adds a new vehicle to inventory', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        id: vehicleId,
        make: 'Porsche',
        model: '911 GT3 RS',
        category: 'Supercar',
        price: 241300,
        quantity: 1
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.quantity).toBe(1);
  });

  test('POST /api/vehicles/:id/purchase decrements stock quantity and blocks when 0', async () => {
    const purchase1 = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(purchase1.statusCode).toBe(200);
    expect(purchase1.body.quantity).toBe(0);

    const purchase2 = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(purchase2.statusCode).toBe(400);
  });

  test('POST /api/vehicles/:id/restock increases vehicle quantity (Admin)', async () => {
    const restock = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 3 });
    expect(restock.statusCode).toBe(200);
    expect(restock.body.quantity).toBe(3);
  });
});

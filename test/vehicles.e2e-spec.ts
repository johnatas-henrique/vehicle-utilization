import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/create-app.js';

interface VehicleBody {
  id: string;
  plate: string;
  color: string;
  brand: string;
  createdAt: string;
  updatedAt: string;
}

const post = async (
  testApp: TestApp,
  body: Record<string, unknown>,
): Promise<VehicleBody> => {
  const response = await request(testApp.app.getHttpServer())
    .post('/vehicles')
    .send(body)
    .expect(201);
  return response.body as VehicleBody;
};

describe('Vehicles (e2e)', () => {
  let testApp: TestApp;

  beforeEach(async () => {
    testApp = await createTestApp();
  });

  afterEach(async () => {
    await testApp.close();
  });

  it('POST /vehicles creates a vehicle', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/vehicles')
      .send({ plate: 'abc1d23', color: 'Azul', brand: 'Volkswagen' })
      .expect(201);

    expect(response.body).toMatchObject({
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Volkswagen',
    });
    expect(response.body).not.toHaveProperty('deletedAt');
  });

  it('POST /vehicles rejects a duplicate plate with 409', async () => {
    await post(testApp, {
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    const response = await request(testApp.app.getHttpServer())
      .post('/vehicles')
      .send({ plate: 'ABC1D23', color: 'Preto', brand: 'Fiat' })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'VEHICLE_PLATE_TAKEN',
        message: expect.any(String) as string,
      },
    });
  });

  it('POST /vehicles rejects an invalid body with 400', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/vehicles')
      .send({ color: 'Azul' })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('GET /vehicles lists created vehicles', async () => {
    await post(testApp, { plate: 'ABC1D23', color: 'Azul', brand: 'Fiat' });
    await post(testApp, { plate: 'XYZ9Z99', color: 'Preto', brand: 'Fiat' });

    const response = await request(testApp.app.getHttpServer())
      .get('/vehicles')
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it('GET /vehicles filters by color and brand without accent or case', async () => {
    await post(testApp, {
      plate: 'ABC1D23',
      color: 'Azul Metálico',
      brand: 'Volkswagen',
    });
    await post(testApp, {
      plate: 'XYZ9Z99',
      color: 'Vermelho',
      brand: 'Fiat',
    });

    const byColor = await request(testApp.app.getHttpServer())
      .get('/vehicles?color=METALICO')
      .expect(200);
    const byColorVehicles = byColor.body as VehicleBody[];
    expect(byColorVehicles).toHaveLength(1);
    expect(byColorVehicles[0]).toMatchObject({ plate: 'ABC1D23' });

    const byBrand = await request(testApp.app.getHttpServer())
      .get('/vehicles?brand=volks')
      .expect(200);
    expect(byBrand.body).toHaveLength(1);

    const combined = await request(testApp.app.getHttpServer())
      .get('/vehicles?color=azul&brand=fiat')
      .expect(200);
    expect(combined.body).toHaveLength(0);
  });

  it('GET /vehicles/:id returns a vehicle', async () => {
    const created = await post(testApp, {
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    const response = await request(testApp.app.getHttpServer())
      .get(`/vehicles/${created.id}`)
      .expect(200);

    expect(response.body).toMatchObject({ id: created.id });
  });

  it('GET /vehicles/:id answers 404 for an unknown id', async () => {
    const response = await request(testApp.app.getHttpServer())
      .get('/vehicles/unknown-id')
      .expect(404);

    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('PATCH /vehicles/:id updates partially', async () => {
    const created = await post(testApp, {
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    const response = await request(testApp.app.getHttpServer())
      .patch(`/vehicles/${created.id}`)
      .send({ color: 'Verde' })
      .expect(200);

    expect(response.body).toMatchObject({
      plate: 'ABC1D23',
      color: 'Verde',
      brand: 'Fiat',
    });
  });

  it('PATCH /vehicles/:id rejects an empty body with 400', async () => {
    const created = await post(testApp, {
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    const response = await request(testApp.app.getHttpServer())
      .patch(`/vehicles/${created.id}`)
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('PATCH /vehicles/:id answers 404 for an unknown id', async () => {
    await request(testApp.app.getHttpServer())
      .patch('/vehicles/unknown-id')
      .send({ color: 'Verde' })
      .expect(404);
  });

  it('DELETE /vehicles/:id removes the vehicle', async () => {
    const created = await post(testApp, {
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    await request(testApp.app.getHttpServer())
      .delete(`/vehicles/${created.id}`)
      .expect(204);

    await request(testApp.app.getHttpServer())
      .get(`/vehicles/${created.id}`)
      .expect(404);
  });

  it('DELETE /vehicles/:id answers 404 when repeated', async () => {
    const created = await post(testApp, {
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    await request(testApp.app.getHttpServer())
      .delete(`/vehicles/${created.id}`)
      .expect(204);

    const response = await request(testApp.app.getHttpServer())
      .delete(`/vehicles/${created.id}`)
      .expect(404);

    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});

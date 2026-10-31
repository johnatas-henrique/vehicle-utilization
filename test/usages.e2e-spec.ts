import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/create-app.js';

interface VehicleBody {
  id: string;
  plate: string;
  color: string;
  brand: string;
}

interface DriverBody {
  id: string;
  name: string;
}

interface UsageBody {
  id: string;
  vehicle: { id: string; plate: string; color: string; brand: string };
  driver: { id: string; name: string };
  reason: string;
  startedAt: string;
  finishedAt: string | null;
}

interface Fixture {
  vehicle: VehicleBody;
  driver: DriverBody;
}

const createFixture = async (testApp: TestApp): Promise<Fixture> => {
  const vehicle = await request(testApp.app.getHttpServer())
    .post('/vehicles')
    .send({ plate: 'ABC1D23', color: 'Azul', brand: 'Fiat' })
    .expect(201);
  const driver = await request(testApp.app.getHttpServer())
    .post('/drivers')
    .send({ name: 'João da Silva' })
    .expect(201);

  return {
    vehicle: vehicle.body as VehicleBody,
    driver: driver.body as DriverBody,
  };
};

const createUsage = async (
  testApp: TestApp,
  vehicleId: string,
  driverId: string,
): Promise<UsageBody> => {
  const response = await request(testApp.app.getHttpServer())
    .post('/usages')
    .send({ vehicleId, driverId, reason: 'Visita a cliente' })
    .expect(201);
  return response.body as UsageBody;
};

describe('Usages (e2e)', () => {
  let testApp: TestApp;

  beforeEach(async () => {
    testApp = await createTestApp();
  });

  afterEach(async () => {
    await testApp.close();
  });

  it('POST /usages creates a usage with the joined view', async () => {
    const { vehicle, driver } = await createFixture(testApp);

    const created = await createUsage(testApp, vehicle.id, driver.id);

    expect(created.vehicle).toMatchObject({
      id: vehicle.id,
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });
    expect(created.driver).toMatchObject({
      id: driver.id,
      name: 'João da Silva',
    });
    expect(created.finishedAt).toBeNull();
    expect(created.startedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('POST /usages rejects an invalid body with 400', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({ vehicleId: '', driverId: '', reason: '' })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('POST /usages rejects a malformed startedAt with 400', async () => {
    const { vehicle, driver } = await createFixture(testApp);

    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: vehicle.id,
        driverId: driver.id,
        reason: 'Visita a cliente',
        startedAt: '2026-01-01',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('POST /usages normalizes an offset to UTC', async () => {
    const { vehicle, driver } = await createFixture(testApp);

    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: vehicle.id,
        driverId: driver.id,
        reason: 'Visita a cliente',
        startedAt: '2026-01-01T10:00:00-03:00',
      })
      .expect(201);

    expect((response.body as UsageBody).startedAt).toBe(
      '2026-01-01T13:00:00.000Z',
    );
  });

  it('POST /usages rejects a future startedAt with 400 USAGE_START_IN_FUTURE', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const future = new Date(Date.now() + 60_000).toISOString();

    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: vehicle.id,
        driverId: driver.id,
        reason: 'Visita a cliente',
        startedAt: future,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'USAGE_START_IN_FUTURE' },
    });
  });

  it('POST /usages answers 404 for an unknown vehicle', async () => {
    const { driver } = await createFixture(testApp);

    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: '2a7f1d9e-0000-4000-8000-000000000000',
        driverId: driver.id,
        reason: 'Visita a cliente',
      })
      .expect(404);

    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('POST /usages answers 404 for an unknown driver', async () => {
    const { vehicle } = await createFixture(testApp);

    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: vehicle.id,
        driverId: '2a7f1d9e-0000-4000-8000-000000000000',
        reason: 'Visita a cliente',
      })
      .expect(404);

    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('POST /usages rejects a vehicle already in use with 409', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const secondDriver = await request(testApp.app.getHttpServer())
      .post('/drivers')
      .send({ name: 'Maria Souza' })
      .expect(201);

    await createUsage(testApp, vehicle.id, driver.id);

    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: vehicle.id,
        driverId: (secondDriver.body as DriverBody).id,
        reason: 'Segunda',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      error: { code: 'VEHICLE_IN_USE' },
    });
  });

  it('POST /usages rejects a driver already using a vehicle with 409', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const secondVehicle = await request(testApp.app.getHttpServer())
      .post('/vehicles')
      .send({ plate: 'XYZ9Z99', color: 'Prata', brand: 'Fiat' })
      .expect(201);

    await createUsage(testApp, vehicle.id, driver.id);

    const response = await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: (secondVehicle.body as VehicleBody).id,
        driverId: driver.id,
        reason: 'Segunda',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      error: { code: 'DRIVER_IN_USE' },
    });
  });

  it('POST /usages/:id/finish stores finishedAt and frees the resources', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const created = await createUsage(testApp, vehicle.id, driver.id);

    const finished = await request(testApp.app.getHttpServer())
      .post(`/usages/${created.id}/finish`)
      .expect(200);

    expect((finished.body as UsageBody).finishedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    await expect(
      createUsage(testApp, vehicle.id, driver.id),
    ).resolves.toMatchObject({ finishedAt: null });
  });

  it('POST /usages/:id/finish answers 409 when repeated', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const created = await createUsage(testApp, vehicle.id, driver.id);

    await request(testApp.app.getHttpServer())
      .post(`/usages/${created.id}/finish`)
      .expect(200);

    const response = await request(testApp.app.getHttpServer())
      .post(`/usages/${created.id}/finish`)
      .expect(409);

    expect(response.body).toMatchObject({
      error: { code: 'USAGE_ALREADY_FINISHED' },
    });
  });

  it('POST /usages/:id/finish answers 404 for an unknown id', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/usages/unknown-id/finish')
      .expect(404);

    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('GET /usages lists usages with driver and vehicle data', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const created = await createUsage(testApp, vehicle.id, driver.id);
    await request(testApp.app.getHttpServer())
      .post(`/usages/${created.id}/finish`)
      .expect(200);

    const response = await request(testApp.app.getHttpServer())
      .get('/usages')
      .expect(200);

    const usages = response.body as UsageBody[];
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      vehicle: { plate: 'ABC1D23', color: 'Azul', brand: 'Fiat' },
      driver: { name: 'João da Silva' },
      reason: 'Visita a cliente',
    });
  });

  it('DELETE /vehicles/:id answers 409 while the vehicle is in use', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const created = await createUsage(testApp, vehicle.id, driver.id);

    const blocked = await request(testApp.app.getHttpServer())
      .delete(`/vehicles/${vehicle.id}`)
      .expect(409);
    expect(blocked.body).toMatchObject({ error: { code: 'VEHICLE_IN_USE' } });

    const blockedDriver = await request(testApp.app.getHttpServer())
      .delete(`/drivers/${driver.id}`)
      .expect(409);
    expect(blockedDriver.body).toMatchObject({
      error: { code: 'DRIVER_IN_USE' },
    });

    await request(testApp.app.getHttpServer())
      .post(`/usages/${created.id}/finish`)
      .expect(200);

    await request(testApp.app.getHttpServer())
      .delete(`/vehicles/${vehicle.id}`)
      .expect(204);
    await request(testApp.app.getHttpServer())
      .delete(`/drivers/${driver.id}`)
      .expect(204);
  });

  it('GET /usages keeps history readable after the resources are removed', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    const created = await createUsage(testApp, vehicle.id, driver.id);
    await request(testApp.app.getHttpServer())
      .post(`/usages/${created.id}/finish`)
      .expect(200);

    await request(testApp.app.getHttpServer())
      .delete(`/vehicles/${vehicle.id}`)
      .expect(204);
    await request(testApp.app.getHttpServer())
      .delete(`/drivers/${driver.id}`)
      .expect(204);

    const response = await request(testApp.app.getHttpServer())
      .get('/usages')
      .expect(200);

    const usages = response.body as UsageBody[];
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      vehicle: { plate: 'ABC1D23' },
      driver: { name: 'João da Silva' },
    });
  });

  it('POST /usages answers 404 when the vehicle was removed', async () => {
    const { vehicle, driver } = await createFixture(testApp);
    await request(testApp.app.getHttpServer())
      .delete(`/vehicles/${vehicle.id}`)
      .expect(204);

    await request(testApp.app.getHttpServer())
      .post('/usages')
      .send({
        vehicleId: vehicle.id,
        driverId: driver.id,
        reason: 'Visita a cliente',
      })
      .expect(404);
  });
});

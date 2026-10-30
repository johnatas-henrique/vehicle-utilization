import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/create-app.js';

interface DriverBody {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const post = async (
  testApp: TestApp,
  body: Record<string, unknown>,
): Promise<DriverBody> => {
  const response = await request(testApp.app.getHttpServer())
    .post('/drivers')
    .send(body)
    .expect(201);
  return response.body as DriverBody;
};

describe('Drivers (e2e)', () => {
  let testApp: TestApp;

  beforeEach(async () => {
    testApp = await createTestApp();
  });

  afterEach(async () => {
    await testApp.close();
  });

  it('POST /drivers creates a driver', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/drivers')
      .send({ name: 'João da Silva' })
      .expect(201);

    expect(response.body).toMatchObject({ name: 'João da Silva' });
    expect(response.body).not.toHaveProperty('deletedAt');
  });

  it('POST /drivers rejects an invalid body with 400', async () => {
    const response = await request(testApp.app.getHttpServer())
      .post('/drivers')
      .send({ name: '   ' })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('POST /drivers accepts two drivers with the same name', async () => {
    const first = await post(testApp, { name: 'João da Silva' });
    const second = await post(testApp, { name: 'João da Silva' });

    expect(first.id).not.toBe(second.id);
  });

  it('GET /drivers lists created drivers', async () => {
    await post(testApp, { name: 'João da Silva' });
    await post(testApp, { name: 'Maria Souza' });

    const response = await request(testApp.app.getHttpServer())
      .get('/drivers')
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it('GET /drivers filters by name without accent and case', async () => {
    await post(testApp, { name: 'João da Silva' });
    await post(testApp, { name: 'José da Silva' });
    await post(testApp, { name: 'Maria Souza' });

    const byAccentless = await request(testApp.app.getHttpServer())
      .get('/drivers?name=JOAO')
      .expect(200);
    const joao = byAccentless.body as DriverBody[];
    expect(joao).toHaveLength(1);
    expect(joao[0]).toMatchObject({ name: 'João da Silva' });

    const bySurname = await request(testApp.app.getHttpServer())
      .get('/drivers?name=silva')
      .expect(200);
    expect(bySurname.body).toHaveLength(2);

    const byAccentedQuery = await request(testApp.app.getHttpServer())
      .get('/drivers?name=JOÃO')
      .expect(200);
    const accented = byAccentedQuery.body as DriverBody[];
    expect(accented).toHaveLength(1);
    expect(accented[0]).toMatchObject({ name: 'João da Silva' });
  });

  it('GET /drivers/:id returns a driver', async () => {
    const created = await post(testApp, { name: 'João da Silva' });

    const response = await request(testApp.app.getHttpServer())
      .get(`/drivers/${created.id}`)
      .expect(200);

    expect(response.body).toMatchObject({ id: created.id });
  });

  it('GET /drivers/:id answers 404 for an unknown id', async () => {
    const response = await request(testApp.app.getHttpServer())
      .get('/drivers/unknown-id')
      .expect(404);

    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('PATCH /drivers/:id updates partially', async () => {
    const created = await post(testApp, { name: 'João da Silva' });

    const response = await request(testApp.app.getHttpServer())
      .patch(`/drivers/${created.id}`)
      .send({ name: 'João Souza' })
      .expect(200);

    expect(response.body).toMatchObject({ name: 'João Souza' });
  });

  it('PATCH /drivers/:id rejects an empty body with 400', async () => {
    const created = await post(testApp, { name: 'João da Silva' });

    const response = await request(testApp.app.getHttpServer())
      .patch(`/drivers/${created.id}`)
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('PATCH /drivers/:id answers 404 for an unknown id', async () => {
    await request(testApp.app.getHttpServer())
      .patch('/drivers/unknown-id')
      .send({ name: 'Outro Nome' })
      .expect(404);
  });

  it('DELETE /drivers/:id removes the driver', async () => {
    const created = await post(testApp, { name: 'João da Silva' });

    await request(testApp.app.getHttpServer())
      .delete(`/drivers/${created.id}`)
      .expect(204);

    await request(testApp.app.getHttpServer())
      .get(`/drivers/${created.id}`)
      .expect(404);
  });

  it('DELETE /drivers/:id answers 404 when repeated', async () => {
    const created = await post(testApp, { name: 'João da Silva' });

    await request(testApp.app.getHttpServer())
      .delete(`/drivers/${created.id}`)
      .expect(204);

    const response = await request(testApp.app.getHttpServer())
      .delete(`/drivers/${created.id}`)
      .expect(404);

    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});

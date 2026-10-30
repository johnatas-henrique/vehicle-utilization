import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/create-app.js';

describe('App (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('GET / reports the service is up without leaking the stack', async () => {
    const response = await request(testApp.app.getHttpServer())
      .get('/')
      .expect(200);

    expect(response.body).toEqual({
      name: 'vehicle-utilization-api',
      status: 'ok',
    });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

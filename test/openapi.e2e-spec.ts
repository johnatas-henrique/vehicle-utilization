import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/create-app.js';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

interface OpenApiOperation {
  responses: Record<string, unknown>;
}

interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    schemas: Record<string, { properties?: Record<string, unknown> }>;
  };
}

interface VehicleBody {
  id: string;
  plate: string;
  color: string;
  brand: string;
  createdAt: string;
  updatedAt: string;
}

const getDocument = async (testApp: TestApp): Promise<OpenApiDocument> => {
  const response = await request(testApp.app.getHttpServer())
    .get('/openapi.json')
    .expect(200);

  return response.body as OpenApiDocument;
};

describe('OpenAPI (e2e)', () => {
  let testApp: TestApp;

  beforeEach(async () => {
    testApp = await createTestApp();
  });

  afterEach(async () => {
    await testApp.close();
  });

  it('serves an OpenAPI 3.1 document', async () => {
    const document = await getDocument(testApp);

    expect(document.openapi).toBe('3.1.0');
    expect(document.info.title).toBe('vehicle-utilization-api');
  });

  it('lists every endpoint of the api', async () => {
    const document = await getDocument(testApp);

    expect(Object.keys(document.paths).sort()).toEqual([
      '/',
      '/drivers',
      '/drivers/{id}',
      '/usages',
      '/usages/{id}/finish',
      '/vehicles',
      '/vehicles/{id}',
    ]);

    const operations = Object.entries(document.paths).flatMap(
      ([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );

    expect(operations.sort()).toEqual([
      'DELETE /drivers/{id}',
      'DELETE /vehicles/{id}',
      'GET /',
      'GET /drivers',
      'GET /drivers/{id}',
      'GET /usages',
      'GET /vehicles',
      'GET /vehicles/{id}',
      'PATCH /drivers/{id}',
      'PATCH /vehicles/{id}',
      'POST /drivers',
      'POST /usages',
      'POST /usages/{id}/finish',
      'POST /vehicles',
    ]);
  });

  it('documents the request body from the schema the pipe enforces', async () => {
    const document = await getDocument(testApp);

    expect(document.components.schemas.CreateVehicle).toMatchObject({
      type: 'object',
      properties: {
        plate: { type: 'string', minLength: 1, maxLength: 16 },
        color: { type: 'string', minLength: 1, maxLength: 40 },
        brand: { type: 'string', minLength: 1, maxLength: 40 },
      },
      required: ['plate', 'color', 'brand'],
    });
  });

  it('keeps the documented vehicle schema aligned with the real response', async () => {
    const document = await getDocument(testApp);

    const response = await request(testApp.app.getHttpServer())
      .post('/vehicles')
      .send({ plate: 'doc1a23', color: 'Cinza', brand: 'Fiat' })
      .expect(201);

    const created = response.body as VehicleBody;
    const documented = Object.keys(
      document.components.schemas.Vehicle?.properties ?? {},
    ).sort();

    expect(documented).toEqual(Object.keys(created).sort());
  });

  it('serves the interactive documentation', async () => {
    const response = await request(testApp.app.getHttpServer())
      .get('/docs')
      .expect(200);

    expect(response.text).toContain('swagger-ui');
  });
});

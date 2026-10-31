import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/create-app.js';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

interface OpenApiExamples {
  [name: string]: { summary: string; value: Record<string, unknown> };
}

interface OpenApiMediaType {
  schema?: Record<string, unknown>;
  examples?: OpenApiExamples;
}

interface OpenApiResponse {
  description: string;
  content?: Record<string, OpenApiMediaType>;
}

interface OpenApiOperation {
  parameters?: unknown[];
  requestBody?: { content: Record<string, OpenApiMediaType> };
  responses: Record<string, OpenApiResponse>;
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

const media = (value?: OpenApiMediaType): OpenApiMediaType => {
  if (!value) {
    throw new Error('media type is not documented');
  }
  return value;
};

const examplesOf = (value?: OpenApiMediaType): OpenApiExamples => {
  const examples = media(value).examples;
  if (!examples) {
    throw new Error('examples are not documented');
  }
  return examples;
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

    expect(document.components.schemas.UpdateVehicle).not.toHaveProperty(
      'required',
    );
  });

  it('pre-fills the request bodies with runnable examples', async () => {
    const document = await getDocument(testApp);

    const vehicleExamples = examplesOf(
      document.paths['/vehicles']?.post?.requestBody?.content?.[
        'application/json'
      ],
    );
    const usageExamples = examplesOf(
      document.paths['/usages']?.post?.requestBody?.content?.[
        'application/json'
      ],
    );

    expect(Object.keys(vehicleExamples)).toEqual([
      'lowercasePlate',
      'duplicatePlate',
    ]);
    expect(vehicleExamples.lowercasePlate?.value).toEqual({
      plate: 'abc1d23',
      color: 'Azul Metálico',
      brand: 'Volkswagen',
    });
    expect(usageExamples.pastWithOffset?.value.startedAt).toBe(
      '2026-01-01T10:00:00-03:00',
    );
    expect(usageExamples.inTheFuture?.value.startedAt).toBe(
      '2030-01-01T00:00:00Z',
    );
  });

  it('pre-fills every error response with the real envelope', async () => {
    const document = await getDocument(testApp);

    const plateTaken = examplesOf(
      document.paths['/vehicles']?.post?.responses['409']?.content?.[
        'application/json'
      ],
    );
    const vehicleInUse = examplesOf(
      document.paths['/vehicles/{id}']?.delete?.responses['409']?.content?.[
        'application/json'
      ],
    );
    const notFound = examplesOf(
      document.paths['/vehicles/{id}']?.get?.responses['404']?.content?.[
        'application/json'
      ],
    );

    expect(plateTaken.envelope?.value).toEqual({
      error: {
        code: 'VEHICLE_PLATE_TAKEN',
        message: 'Vehicle with plate ABC1D23 already exists',
      },
    });
    expect(vehicleInUse.envelope?.value).toEqual({
      error: {
        code: 'VEHICLE_IN_USE',
        message: 'Vehicle <id> has an active usage',
      },
    });
    expect(notFound.envelope?.value).toEqual({
      error: { code: 'NOT_FOUND', message: 'Vehicle <id> was not found' },
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

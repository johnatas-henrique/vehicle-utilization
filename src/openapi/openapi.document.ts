import type {
  OpenAPIObject,
  ParameterObject,
  SchemaObject,
} from '@nestjs/swagger';
import { z } from 'zod';
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleQuerySchema,
} from '../vehicles/http/vehicle.schemas.js';
import {
  createDriverSchema,
  driverQuerySchema,
  updateDriverSchema,
} from '../drivers/http/driver.schemas.js';
import { createUsageSchema } from '../usages/http/usage.schemas.js';

export const vehicleViewSchema = z.object({
  id: z.string(),
  plate: z.string(),
  color: z.string(),
  brand: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const driverViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const usageViewSchema = z.object({
  id: z.string(),
  vehicle: z.object({
    id: z.string(),
    plate: z.string(),
    color: z.string(),
    brand: z.string(),
  }),
  driver: z.object({ id: z.string(), name: z.string() }),
  reason: z.string(),
  startedAt: z.iso.datetime({ offset: true }),
  finishedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.string()).optional(),
  }),
});

const toJsonSchema = (schema: z.ZodType): SchemaObject => {
  const json = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  }) as Record<string, unknown>;

  delete json.$schema;

  return json;
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

type Examples = Record<string, { summary: string; value: unknown }>;

const jsonBody = (name: string, examples?: Examples) => ({
  required: true,
  content: {
    'application/json': {
      schema: ref(name),
      ...(examples ? { examples } : {}),
    },
  },
});

const jsonResponse = (
  description: string,
  name: string,
  examples?: Examples,
) => ({
  description,
  content: {
    'application/json': {
      schema: ref(name),
      ...(examples ? { examples } : {}),
    },
  },
});

const jsonListResponse = (description: string, name: string) => ({
  description,
  content: {
    'application/json': { schema: { type: 'array', items: ref(name) } },
  },
});

const errorBody = (code: string, message: string, details?: string[]) => ({
  error: { code, message, ...(details ? { details } : {}) },
});

const errorResponse = (
  description: string,
  example?: Record<string, unknown>,
) => ({
  description,
  content: {
    'application/json': {
      schema: ref('Error'),
      ...(example
        ? { examples: { envelope: { summary: description, value: example } } }
        : {}),
    },
  },
});

const idParam: ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  example: '6c1f2a54-3f4b-4a6e-9a8e-2f7d1c9b0a11',
};

const queryParam = (
  name: string,
  description: string,
  example: string,
): ParameterObject => ({
  name,
  in: 'query',
  required: false,
  schema: { type: 'string' },
  description,
  example,
});

const conflict = (code: string, description: string, message: string) =>
  errorResponse(`${description} (${code})`, errorBody(code, message));

export const openApiDocument: OpenAPIObject = {
  openapi: '3.1.0',
  info: {
    title: 'vehicle-utilization-api',
    version: '1.0.0',
    description:
      'CRUD of vehicles, drivers and usages with usage exclusivity enforcement. Decisions, trade-offs and known limitations live in the repository README.',
  },
  paths: {
    '/': {
      get: {
        summary: 'Service status',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    status: { type: 'string' },
                  },
                  required: ['name', 'status'],
                },
                examples: {
                  ready: {
                    summary: 'Service answering on its default port',
                    value: {
                      name: 'vehicle-utilization-api',
                      status: 'ok',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/vehicles': {
      post: {
        summary: 'Creates a vehicle',
        requestBody: jsonBody('CreateVehicle', {
          lowercasePlate: {
            summary: 'Lowercase plate, stored as ABC1D23',
            value: {
              plate: 'abc1d23',
              color: 'Azul Metálico',
              brand: 'Volkswagen',
            },
          },
          duplicatePlate: {
            summary: 'Same plate again, answered with 409',
            value: { plate: 'ABC1D23', color: 'Preto', brand: 'Fiat' },
          },
        }),
        responses: {
          201: jsonResponse('Vehicle created', 'Vehicle', {
            created: {
              summary: 'Plate normalized to uppercase by the schema',
              value: {
                id: '3f6c8f2a-8c1e-4b1f-9f3a-1d2c3b4a5e60',
                plate: 'ABC1D23',
                color: 'Azul Metálico',
                brand: 'Volkswagen',
                createdAt: '2026-10-31T02:00:00.000Z',
                updatedAt: '2026-10-31T02:00:00.000Z',
              },
            },
          }),
          400: errorResponse(
            'Invalid body (VALIDATION_ERROR)',
            errorBody(
              'VALIDATION_ERROR',
              'plate: Invalid input: expected string, received undefined',
            ),
          ),
          409: conflict(
            'VEHICLE_PLATE_TAKEN',
            'Plate already registered',
            'Vehicle with plate ABC1D23 already exists',
          ),
        },
      },
      get: {
        summary: 'Lists vehicles',
        parameters: [
          queryParam(
            'color',
            'Color filter, substring match ignoring case and accents',
            'metalico',
          ),
          queryParam(
            'brand',
            'Brand filter, substring match ignoring case and accents',
            'volks',
          ),
        ],
        responses: { 200: jsonListResponse('Vehicle list', 'Vehicle') },
      },
    },
    '/vehicles/{id}': {
      get: {
        summary: 'Retrieves a vehicle',
        parameters: [idParam],
        responses: {
          200: jsonResponse('Vehicle found', 'Vehicle'),
          404: errorResponse(
            'Vehicle not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Vehicle <id> was not found'),
          ),
        },
      },
      patch: {
        summary: 'Partially updates a vehicle',
        parameters: [idParam],
        requestBody: jsonBody('UpdateVehicle', {
          singleField: {
            summary: 'Only the color changes, plate and brand are preserved',
            value: { color: 'Verde' },
          },
          emptyBody: {
            summary: 'Empty body is rejected with 400',
            value: {},
          },
        }),
        responses: {
          200: jsonResponse('Vehicle updated', 'Vehicle'),
          400: errorResponse(
            'Invalid body (VALIDATION_ERROR)',
            errorBody(
              'VALIDATION_ERROR',
              'At least one field must be provided',
            ),
          ),
          404: errorResponse(
            'Vehicle not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Vehicle <id> was not found'),
          ),
          409: conflict(
            'VEHICLE_PLATE_TAKEN',
            'Plate already registered',
            'Vehicle with plate ABC1D23 already exists',
          ),
        },
      },
      delete: {
        summary: 'Deletes a vehicle',
        parameters: [idParam],
        responses: {
          204: { description: 'Vehicle deleted' },
          404: errorResponse(
            'Vehicle not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Vehicle <id> was not found'),
          ),
          409: conflict(
            'VEHICLE_IN_USE',
            'Vehicle has an open usage',
            'Vehicle <id> has an active usage',
          ),
        },
      },
    },
    '/drivers': {
      post: {
        summary: 'Creates a driver',
        requestBody: jsonBody('CreateDriver', {
          accentedName: {
            summary: 'Accented name, later matched by an unaccented query',
            value: { name: 'João da Silva' },
          },
        }),
        responses: {
          201: jsonResponse('Driver created', 'Driver', {
            created: {
              summary: 'Driver as stored',
              value: {
                id: '9b2e4c31-7a5d-4f80-b2c1-6e8d0a3f4b77',
                name: 'João da Silva',
                createdAt: '2026-10-31T02:00:00.000Z',
                updatedAt: '2026-10-31T02:00:00.000Z',
              },
            },
          }),
          400: errorResponse(
            'Invalid body (VALIDATION_ERROR)',
            errorBody(
              'VALIDATION_ERROR',
              'name: Too small: expected string to have >=1 characters',
            ),
          ),
        },
      },
      get: {
        summary: 'Lists drivers',
        parameters: [
          queryParam(
            'name',
            'Name filter, substring match ignoring case and accents',
            'joao',
          ),
        ],
        responses: { 200: jsonListResponse('Driver list', 'Driver') },
      },
    },
    '/drivers/{id}': {
      get: {
        summary: 'Retrieves a driver',
        parameters: [idParam],
        responses: {
          200: jsonResponse('Driver found', 'Driver'),
          404: errorResponse(
            'Driver not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Driver <id> was not found'),
          ),
        },
      },
      patch: {
        summary: 'Partially updates a driver',
        parameters: [idParam],
        requestBody: jsonBody('UpdateDriver', {
          rename: {
            summary: 'Only the name changes',
            value: { name: 'Maria Souza Lima' },
          },
        }),
        responses: {
          200: jsonResponse('Driver updated', 'Driver'),
          400: errorResponse(
            'Invalid body (VALIDATION_ERROR)',
            errorBody(
              'VALIDATION_ERROR',
              'At least one field must be provided',
            ),
          ),
          404: errorResponse(
            'Driver not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Driver <id> was not found'),
          ),
        },
      },
      delete: {
        summary: 'Deletes a driver',
        parameters: [idParam],
        responses: {
          204: { description: 'Driver deleted' },
          404: errorResponse(
            'Driver not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Driver <id> was not found'),
          ),
          409: conflict(
            'DRIVER_IN_USE',
            'Driver has an open usage',
            'Driver <id> has an active usage',
          ),
        },
      },
    },
    '/usages': {
      post: {
        summary: 'Creates a usage',
        requestBody: jsonBody('CreateUsage', {
          now: {
            summary: 'startedAt omitted, the server stamps the current instant',
            value: {
              vehicleId: '3f6c8f2a-8c1e-4b1f-9f3a-1d2c3b4a5e60',
              driverId: '9b2e4c31-7a5d-4f80-b2c1-6e8d0a3f4b77',
              reason: 'Visita a cliente',
            },
          },
          pastWithOffset: {
            summary: 'Explicit start with -03:00 offset, stored as 13:00Z',
            value: {
              vehicleId: '3f6c8f2a-8c1e-4b1f-9f3a-1d2c3b4a5e60',
              driverId: '9b2e4c31-7a5d-4f80-b2c1-6e8d0a3f4b77',
              reason: 'Visita a cliente',
              startedAt: '2026-01-01T10:00:00-03:00',
            },
          },
          inTheFuture: {
            summary: 'Future start is rejected with 400 USAGE_START_IN_FUTURE',
            value: {
              vehicleId: '3f6c8f2a-8c1e-4b1f-9f3a-1d2c3b4a5e60',
              driverId: '9b2e4c31-7a5d-4f80-b2c1-6e8d0a3f4b77',
              reason: 'Futuro',
              startedAt: '2030-01-01T00:00:00Z',
            },
          },
        }),
        responses: {
          201: jsonResponse('Usage created', 'Usage', {
            created: {
              summary: 'Vehicle and driver resolved into the response',
              value: {
                id: 'c4e668a4-6ba2-40b1-bc32-d0ac9dd9900f',
                vehicle: {
                  id: '3f6c8f2a-8c1e-4b1f-9f3a-1d2c3b4a5e60',
                  plate: 'ABC1D23',
                  color: 'Azul Metálico',
                  brand: 'Volkswagen',
                },
                driver: {
                  id: '9b2e4c31-7a5d-4f80-b2c1-6e8d0a3f4b77',
                  name: 'João da Silva',
                },
                reason: 'Visita a cliente',
                startedAt: '2026-10-31T02:00:00.000Z',
                finishedAt: null,
              },
            },
          }),
          400: errorResponse(
            'Invalid body (VALIDATION_ERROR) or start date in the future (USAGE_START_IN_FUTURE)',
            errorBody(
              'USAGE_START_IN_FUTURE',
              'startedAt must not be in the future',
            ),
          ),
          404: errorResponse(
            'Vehicle or driver not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Vehicle <id> was not found'),
          ),
          409: conflict(
            'VEHICLE_IN_USE',
            'Vehicle already in use',
            'Vehicle <id> is already in use',
          ),
        },
      },
      get: {
        summary: 'Lists usages with vehicle and driver',
        responses: { 200: jsonListResponse('Usage list', 'Usage') },
      },
    },
    '/usages/{id}/finish': {
      post: {
        summary: 'Finishes a usage',
        parameters: [idParam],
        responses: {
          200: jsonResponse('Usage finished', 'Usage', {
            finished: {
              summary: 'finishedAt stamped by the server',
              value: {
                id: 'c4e668a4-6ba2-40b1-bc32-d0ac9dd9900f',
                vehicle: {
                  id: '3f6c8f2a-8c1e-4b1f-9f3a-1d2c3b4a5e60',
                  plate: 'ABC1D23',
                  color: 'Azul Metálico',
                  brand: 'Volkswagen',
                },
                driver: {
                  id: '9b2e4c31-7a5d-4f80-b2c1-6e8d0a3f4b77',
                  name: 'João da Silva',
                },
                reason: 'Visita a cliente',
                startedAt: '2026-10-31T02:00:00.000Z',
                finishedAt: '2026-10-31T05:30:00.000Z',
              },
            },
          }),
          404: errorResponse(
            'Usage not found (NOT_FOUND)',
            errorBody('NOT_FOUND', 'Usage <id> was not found'),
          ),
          409: conflict(
            'USAGE_ALREADY_FINISHED',
            'Usage already finished',
            'Usage <id> is already finished',
          ),
        },
      },
    },
  },
  components: {
    schemas: {
      CreateVehicle: toJsonSchema(createVehicleSchema),
      UpdateVehicle: toJsonSchema(updateVehicleSchema),
      Vehicle: toJsonSchema(vehicleViewSchema),
      CreateDriver: toJsonSchema(createDriverSchema),
      UpdateDriver: toJsonSchema(updateDriverSchema),
      Driver: toJsonSchema(driverViewSchema),
      CreateUsage: toJsonSchema(createUsageSchema),
      Usage: toJsonSchema(usageViewSchema),
      Error: toJsonSchema(errorSchema),
      VehicleQuery: toJsonSchema(vehicleQuerySchema),
      DriverQuery: toJsonSchema(driverQuerySchema),
    },
  },
};

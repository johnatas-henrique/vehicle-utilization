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

const jsonBody = (name: string) => ({
  required: true,
  content: { 'application/json': { schema: ref(name) } },
});

const jsonResponse = (description: string, name: string) => ({
  description,
  content: { 'application/json': { schema: ref(name) } },
});

const jsonListResponse = (description: string, name: string) => ({
  description,
  content: {
    'application/json': { schema: { type: 'array', items: ref(name) } },
  },
});

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ref('Error') } },
});

const idParam: ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

const conflict = (code: string, description: string) => ({
  description: `${description} (${code})`,
  content: { 'application/json': { schema: ref('Error') } },
});

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
              },
            },
          },
        },
      },
    },
    '/vehicles': {
      post: {
        summary: 'Creates a vehicle',
        requestBody: jsonBody('CreateVehicle'),
        responses: {
          201: jsonResponse('Vehicle created', 'Vehicle'),
          400: errorResponse('Invalid body (VALIDATION_ERROR)'),
          409: conflict('VEHICLE_PLATE_TAKEN', 'Plate already registered'),
        },
      },
      get: {
        summary: 'Lists vehicles',
        parameters: [
          {
            name: 'color',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'Color filter, substring match ignoring case and accents',
          },
          {
            name: 'brand',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'Brand filter, substring match ignoring case and accents',
          },
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
          404: errorResponse('Vehicle not found (NOT_FOUND)'),
        },
      },
      patch: {
        summary: 'Partially updates a vehicle',
        parameters: [idParam],
        requestBody: jsonBody('UpdateVehicle'),
        responses: {
          200: jsonResponse('Vehicle updated', 'Vehicle'),
          400: errorResponse('Invalid body (VALIDATION_ERROR)'),
          404: errorResponse('Vehicle not found (NOT_FOUND)'),
          409: conflict('VEHICLE_PLATE_TAKEN', 'Plate already registered'),
        },
      },
      delete: {
        summary: 'Deletes a vehicle',
        parameters: [idParam],
        responses: {
          204: { description: 'Vehicle deleted' },
          404: errorResponse('Vehicle not found (NOT_FOUND)'),
          409: conflict('VEHICLE_IN_USE', 'Vehicle has an open usage'),
        },
      },
    },
    '/drivers': {
      post: {
        summary: 'Creates a driver',
        requestBody: jsonBody('CreateDriver'),
        responses: {
          201: jsonResponse('Driver created', 'Driver'),
          400: errorResponse('Invalid body (VALIDATION_ERROR)'),
        },
      },
      get: {
        summary: 'Lists drivers',
        parameters: [
          {
            name: 'name',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'Name filter, substring match ignoring case and accents',
          },
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
          404: errorResponse('Driver not found (NOT_FOUND)'),
        },
      },
      patch: {
        summary: 'Partially updates a driver',
        parameters: [idParam],
        requestBody: jsonBody('UpdateDriver'),
        responses: {
          200: jsonResponse('Driver updated', 'Driver'),
          400: errorResponse('Invalid body (VALIDATION_ERROR)'),
          404: errorResponse('Driver not found (NOT_FOUND)'),
        },
      },
      delete: {
        summary: 'Deletes a driver',
        parameters: [idParam],
        responses: {
          204: { description: 'Driver deleted' },
          404: errorResponse('Driver not found (NOT_FOUND)'),
          409: conflict('DRIVER_IN_USE', 'Driver has an open usage'),
        },
      },
    },
    '/usages': {
      post: {
        summary: 'Creates a usage',
        requestBody: jsonBody('CreateUsage'),
        responses: {
          201: jsonResponse('Usage created', 'Usage'),
          400: errorResponse(
            'Invalid body (VALIDATION_ERROR) or start date in the future (USAGE_START_IN_FUTURE)',
          ),
          404: errorResponse('Vehicle or driver not found (NOT_FOUND)'),
          409: conflict('VEHICLE_IN_USE', 'Vehicle already in use'),
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
          200: jsonResponse('Usage finished', 'Usage'),
          404: errorResponse('Usage not found (NOT_FOUND)'),
          409: conflict('USAGE_ALREADY_FINISHED', 'Usage already finished'),
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

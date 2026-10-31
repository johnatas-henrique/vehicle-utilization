import { Controller, Get } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { openApiDocument } from './openapi.document.js';

@Controller('openapi.json')
export class OpenApiController {
  @Get()
  document(): OpenAPIObject {
    return openApiDocument;
  }
}

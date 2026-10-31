import type { NestExpressApplication } from '@nestjs/platform-express';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { openApiDocument } from './openapi/openapi.document.js';

export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  SwaggerModule.setup('docs', app, openApiDocument);
}

import type { NestExpressApplication } from '@nestjs/platform-express';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';

export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new StandardSchemaValidationPipe());
}

import type { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';

export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  app.useGlobalFilters(new AllExceptionsFilter());
}

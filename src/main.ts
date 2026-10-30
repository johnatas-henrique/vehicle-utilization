import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(port);

  Logger.log(`HTTP server listening on port ${port}`, 'Bootstrap');
}

await bootstrap();

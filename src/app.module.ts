import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envSchema } from './config/env.schema.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => envSchema.parse(raw),
    }),
    VehiclesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

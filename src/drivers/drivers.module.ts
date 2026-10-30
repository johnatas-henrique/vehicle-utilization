import { Module } from '@nestjs/common';
import { DriversService } from './application/drivers.service.js';
import { DriverRepository } from './domain/driver.repository.js';
import { DriversController } from './http/drivers.controller.js';
import { InMemoryDriverRepository } from './infra/in-memory-driver.repository.js';

@Module({
  controllers: [DriversController],
  providers: [
    DriversService,
    { provide: DriverRepository, useClass: InMemoryDriverRepository },
  ],
})
export class DriversModule {}

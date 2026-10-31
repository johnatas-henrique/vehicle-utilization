import { Module } from '@nestjs/common';
import { UsageCoreModule } from '../usages/usage-core.module.js';
import { DriversService } from './application/drivers.service.js';
import { DriverRepository } from './domain/driver.repository.js';
import { DriversController } from './http/drivers.controller.js';
import { InMemoryDriverRepository } from './infra/in-memory-driver.repository.js';

@Module({
  imports: [UsageCoreModule],
  controllers: [DriversController],
  providers: [
    DriversService,
    { provide: DriverRepository, useClass: InMemoryDriverRepository },
  ],
  exports: [DriversService],
})
export class DriversModule {}

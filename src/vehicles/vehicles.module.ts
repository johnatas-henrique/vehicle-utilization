import { Module } from '@nestjs/common';
import { UsageCoreModule } from '../usages/usage-core.module.js';
import { VehiclesService } from './application/vehicles.service.js';
import { VehicleRepository } from './domain/vehicle.repository.js';
import { VehiclesController } from './http/vehicles.controller.js';
import { InMemoryVehicleRepository } from './infra/in-memory-vehicle.repository.js';

@Module({
  imports: [UsageCoreModule],
  controllers: [VehiclesController],
  providers: [
    VehiclesService,
    { provide: VehicleRepository, useClass: InMemoryVehicleRepository },
  ],
  exports: [VehiclesService],
})
export class VehiclesModule {}

import { Module } from '@nestjs/common';
import { VehiclesService } from './application/vehicles.service.js';
import { VehicleRepository } from './domain/vehicle.repository.js';
import { VehiclesController } from './http/vehicles.controller.js';
import { InMemoryVehicleRepository } from './infra/in-memory-vehicle.repository.js';

@Module({
  controllers: [VehiclesController],
  providers: [
    VehiclesService,
    { provide: VehicleRepository, useClass: InMemoryVehicleRepository },
  ],
})
export class VehiclesModule {}

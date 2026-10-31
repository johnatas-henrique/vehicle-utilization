import { Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { UsagesService } from './application/usages.service.js';
import { UsagesController } from './http/usages.controller.js';
import { UsageCoreModule } from './usage-core.module.js';

@Module({
  imports: [UsageCoreModule, VehiclesModule, DriversModule],
  controllers: [UsagesController],
  providers: [UsagesService],
})
export class UsagesModule {}

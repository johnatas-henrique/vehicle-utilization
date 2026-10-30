import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VehiclesService } from '../application/vehicles.service.js';
import type { VehicleView } from '../domain/vehicle.js';
import {
  createVehicleSchema,
  type CreateVehicleInput,
  updateVehicleSchema,
  type UpdateVehicleInput,
  type VehicleQuery,
  vehicleQuerySchema,
} from './vehicle.schemas.js';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body({ schema: createVehicleSchema }) body: CreateVehicleInput,
  ): Promise<VehicleView> {
    return this.vehiclesService.create(body);
  }

  @Get()
  list(
    @Query({ schema: vehicleQuerySchema }) query: VehicleQuery,
  ): Promise<VehicleView[]> {
    return this.vehiclesService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<VehicleView> {
    return this.vehiclesService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body({ schema: updateVehicleSchema }) body: UpdateVehicleInput,
  ): Promise<VehicleView> {
    return this.vehiclesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}

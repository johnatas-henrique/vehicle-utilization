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
import { DriversService } from '../application/drivers.service.js';
import type { DriverView } from '../domain/driver.js';
import {
  createDriverSchema,
  type CreateDriverInput,
  type DriverQuery,
  driverQuerySchema,
  updateDriverSchema,
  type UpdateDriverInput,
} from './driver.schemas.js';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  create(
    @Body({ schema: createDriverSchema }) body: CreateDriverInput,
  ): Promise<DriverView> {
    return this.driversService.create(body);
  }

  @Get()
  list(
    @Query({ schema: driverQuerySchema }) query: DriverQuery,
  ): Promise<DriverView[]> {
    return this.driversService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<DriverView> {
    return this.driversService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body({ schema: updateDriverSchema }) body: UpdateDriverInput,
  ): Promise<DriverView> {
    return this.driversService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.driversService.remove(id);
  }
}

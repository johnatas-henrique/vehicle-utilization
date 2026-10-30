import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HttpErrorPayload } from '../../common/errors/error-code.js';
import type {
  NewVehicle,
  Vehicle,
  VehicleChanges,
  VehicleFilter,
  VehicleView,
} from '../domain/vehicle.js';
import { toView } from '../domain/vehicle.js';
import { VehicleRepository } from '../domain/vehicle.repository.js';

@Injectable()
export class VehiclesService {
  constructor(private readonly vehicles: VehicleRepository) {}

  async create(input: NewVehicle): Promise<VehicleView> {
    await this.assertPlateAvailable(input.plate);
    return toView(await this.vehicles.create(input));
  }

  async getById(id: string): Promise<VehicleView> {
    return toView(await this.findOrFail(id));
  }

  async list(filter: VehicleFilter): Promise<VehicleView[]> {
    const vehicles = await this.vehicles.list(filter);
    return vehicles.map(toView);
  }

  async update(id: string, changes: VehicleChanges): Promise<VehicleView> {
    await this.findOrFail(id);

    if (changes.plate !== undefined) {
      await this.assertPlateAvailable(changes.plate, id);
    }

    const updated = await this.vehicles.update(id, changes);
    if (updated === null) {
      throw this.notFound(id);
    }

    return toView(updated);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.vehicles.softDelete(id);
    if (!removed) {
      throw this.notFound(id);
    }
  }

  private async findOrFail(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findById(id);
    if (vehicle === null) {
      throw this.notFound(id);
    }
    return vehicle;
  }

  private async assertPlateAvailable(
    plate: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.vehicles.findByPlate(plate);
    if (existing !== null && existing.id !== currentId) {
      const payload: HttpErrorPayload = {
        code: 'VEHICLE_PLATE_TAKEN',
        message: `Vehicle with plate ${plate} already exists`,
      };
      throw new ConflictException(payload);
    }
  }

  private notFound(id: string): NotFoundException {
    const payload: HttpErrorPayload = {
      code: 'NOT_FOUND',
      message: `Vehicle ${id} was not found`,
    };
    return new NotFoundException(payload);
  }
}

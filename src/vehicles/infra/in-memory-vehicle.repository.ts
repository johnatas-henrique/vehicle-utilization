import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { normalizeText } from '../../common/text/normalize.js';
import type {
  NewVehicle,
  Vehicle,
  VehicleChanges,
  VehicleFilter,
} from '../domain/vehicle.js';
import { VehicleRepository } from '../domain/vehicle.repository.js';

@Injectable()
export class InMemoryVehicleRepository extends VehicleRepository {
  private readonly vehicles = new Map<string, Vehicle>();

  create(input: NewVehicle): Promise<Vehicle> {
    const now = new Date().toISOString();
    const vehicle: Vehicle = {
      id: randomUUID(),
      plate: input.plate,
      color: input.color,
      brand: input.brand,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.vehicles.set(vehicle.id, vehicle);
    return Promise.resolve(vehicle);
  }

  findById(id: string): Promise<Vehicle | null> {
    const vehicle = this.vehicles.get(id);
    // Soft delete is filtered here, not in the service, so no caller can forget it.
    return Promise.resolve(vehicle?.deletedAt === null ? vehicle : null);
  }

  findForHistory(id: string): Promise<Vehicle | null> {
    return Promise.resolve(this.vehicles.get(id) ?? null);
  }

  findByPlate(plate: string): Promise<Vehicle | null> {
    const target = normalizeText(plate);
    for (const vehicle of this.vehicles.values()) {
      if (
        vehicle.deletedAt === null &&
        normalizeText(vehicle.plate) === target
      ) {
        return Promise.resolve(vehicle);
      }
    }
    return Promise.resolve(null);
  }

  list(filter: VehicleFilter): Promise<Vehicle[]> {
    const color = filter.color ? normalizeText(filter.color) : null;
    const brand = filter.brand ? normalizeText(filter.brand) : null;

    const matches = [...this.vehicles.values()].filter((vehicle) => {
      if (vehicle.deletedAt !== null) {
        return false;
      }
      if (color && !normalizeText(vehicle.color).includes(color)) {
        return false;
      }
      if (brand && !normalizeText(vehicle.brand).includes(brand)) {
        return false;
      }
      return true;
    });

    return Promise.resolve(matches);
  }

  update(id: string, changes: VehicleChanges): Promise<Vehicle | null> {
    const current = this.vehicles.get(id);
    if (!current || current.deletedAt !== null) {
      return Promise.resolve(null);
    }

    const updated: Vehicle = {
      id: current.id,
      plate: changes.plate ?? current.plate,
      color: changes.color ?? current.color,
      brand: changes.brand ?? current.brand,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.vehicles.set(id, updated);
    return Promise.resolve(updated);
  }

  softDelete(id: string): Promise<boolean> {
    const current = this.vehicles.get(id);
    if (!current || current.deletedAt !== null) {
      return Promise.resolve(false);
    }

    const now = new Date().toISOString();
    this.vehicles.set(id, { ...current, deletedAt: now, updatedAt: now });
    return Promise.resolve(true);
  }
}

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { normalizeText } from '../../common/text/normalize.js';
import type {
  Driver,
  DriverChanges,
  DriverFilter,
  NewDriver,
} from '../domain/driver.js';
import { DriverRepository } from '../domain/driver.repository.js';

@Injectable()
export class InMemoryDriverRepository extends DriverRepository {
  private readonly drivers = new Map<string, Driver>();

  create(input: NewDriver): Promise<Driver> {
    const now = new Date().toISOString();
    const driver: Driver = {
      id: randomUUID(),
      name: input.name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.drivers.set(driver.id, driver);
    return Promise.resolve(driver);
  }

  findById(id: string): Promise<Driver | null> {
    const driver = this.drivers.get(id);
    return Promise.resolve(driver?.deletedAt === null ? driver : null);
  }

  list(filter: DriverFilter): Promise<Driver[]> {
    const name = filter.name ? normalizeText(filter.name) : null;

    const matches = [...this.drivers.values()].filter((driver) => {
      if (driver.deletedAt !== null) {
        return false;
      }
      if (name && !normalizeText(driver.name).includes(name)) {
        return false;
      }
      return true;
    });

    return Promise.resolve(matches);
  }

  update(id: string, changes: DriverChanges): Promise<Driver | null> {
    const current = this.drivers.get(id);
    if (!current || current.deletedAt !== null) {
      return Promise.resolve(null);
    }

    const updated: Driver = {
      id: current.id,
      name: changes.name ?? current.name,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.drivers.set(id, updated);
    return Promise.resolve(updated);
  }

  softDelete(id: string): Promise<boolean> {
    const current = this.drivers.get(id);
    if (!current || current.deletedAt !== null) {
      return Promise.resolve(false);
    }

    const now = new Date().toISOString();
    this.drivers.set(id, { ...current, deletedAt: now, updatedAt: now });
    return Promise.resolve(true);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import type { HttpErrorPayload } from '../../common/errors/error-code.js';
import type {
  Driver,
  DriverChanges,
  DriverFilter,
  DriverView,
  NewDriver,
} from '../domain/driver.js';
import { toView } from '../domain/driver.js';
import { DriverRepository } from '../domain/driver.repository.js';

@Injectable()
export class DriversService {
  constructor(private readonly drivers: DriverRepository) {}

  async create(input: NewDriver): Promise<DriverView> {
    return toView(await this.drivers.create(input));
  }

  async getById(id: string): Promise<DriverView> {
    return toView(await this.findOrFail(id));
  }

  async list(filter: DriverFilter): Promise<DriverView[]> {
    const drivers = await this.drivers.list(filter);
    return drivers.map(toView);
  }

  async update(id: string, changes: DriverChanges): Promise<DriverView> {
    await this.findOrFail(id);

    const updated = await this.drivers.update(id, changes);
    if (updated === null) {
      throw this.notFound(id);
    }

    return toView(updated);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.drivers.softDelete(id);
    if (!removed) {
      throw this.notFound(id);
    }
  }

  private async findOrFail(id: string): Promise<Driver> {
    const driver = await this.drivers.findById(id);
    if (driver === null) {
      throw this.notFound(id);
    }
    return driver;
  }

  private notFound(id: string): NotFoundException {
    const payload: HttpErrorPayload = {
      code: 'NOT_FOUND',
      message: `Driver ${id} was not found`,
    };
    return new NotFoundException(payload);
  }
}

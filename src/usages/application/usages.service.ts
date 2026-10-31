import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ErrorCode,
  HttpErrorPayload,
} from '../../common/errors/error-code.js';
import { DriversService } from '../../drivers/application/drivers.service.js';
import { VehiclesService } from '../../vehicles/application/vehicles.service.js';
import type { Usage, UsageView } from '../domain/usage.js';
import { toView } from '../domain/usage.js';
import { UsageRepository } from '../domain/usage.repository.js';
import type { CreateUsageInput } from '../http/usage.schemas.js';

@Injectable()
export class UsagesService {
  constructor(
    private readonly usages: UsageRepository,
    private readonly vehicles: VehiclesService,
    private readonly drivers: DriversService,
  ) {}

  async create(input: CreateUsageInput): Promise<UsageView> {
    const vehicle = await this.vehicles.getById(input.vehicleId);
    const driver = await this.drivers.getById(input.driverId);
    const startedAt = this.resolveStartedAt(input.startedAt);

    if (await this.usages.findActiveByVehicle(input.vehicleId)) {
      throw this.conflict(
        'VEHICLE_IN_USE',
        `Vehicle ${input.vehicleId} is already in use`,
      );
    }
    if (await this.usages.findActiveByDriver(input.driverId)) {
      throw this.conflict(
        'DRIVER_IN_USE',
        `Driver ${input.driverId} is already using a vehicle`,
      );
    }

    const created = await this.usages.create({
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      reason: input.reason,
      startedAt,
    });

    return toView(created, vehicle, driver);
  }

  async finish(id: string): Promise<UsageView> {
    const usage = await this.findOrFail(id);

    if (usage.finishedAt !== null) {
      throw this.conflict(
        'USAGE_ALREADY_FINISHED',
        `Usage ${id} is already finished`,
      );
    }

    const finished = await this.usages.finish(id);
    if (finished === null) {
      throw this.notFound(id);
    }

    return this.buildView(finished);
  }

  async list(): Promise<UsageView[]> {
    const usages = await this.usages.list();
    return Promise.all(usages.map((usage) => this.buildView(usage)));
  }

  private async buildView(usage: Usage): Promise<UsageView> {
    const vehicle = await this.vehicles.findForHistory(usage.vehicleId);
    const driver = await this.drivers.findForHistory(usage.driverId);

    if (vehicle === null || driver === null) {
      throw new Error(
        `Usage ${usage.id} references a missing vehicle or driver`,
      );
    }

    return toView(usage, vehicle, driver);
  }

  private resolveStartedAt(startedAt: string | undefined): string {
    const instant = startedAt === undefined ? new Date() : new Date(startedAt);

    if (instant.getTime() > Date.now()) {
      const payload: HttpErrorPayload = {
        code: 'USAGE_START_IN_FUTURE',
        message: 'startedAt must not be in the future',
      };
      throw new BadRequestException(payload);
    }

    return instant.toISOString();
  }

  private async findOrFail(id: string): Promise<Usage> {
    const usage = await this.usages.findById(id);
    if (usage === null) {
      throw this.notFound(id);
    }
    return usage;
  }

  private notFound(id: string): NotFoundException {
    const payload: HttpErrorPayload = {
      code: 'NOT_FOUND',
      message: `Usage ${id} was not found`,
    };
    return new NotFoundException(payload);
  }

  private conflict(code: ErrorCode, message: string): ConflictException {
    const payload: HttpErrorPayload = { code, message };
    return new ConflictException(payload);
  }
}

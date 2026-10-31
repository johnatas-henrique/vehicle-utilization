import { Injectable } from '@nestjs/common';
import { UsageRepository } from '../domain/usage.repository.js';
import { ActiveUsageChecker } from './active-usage.checker.js';

@Injectable()
export class RepositoryActiveUsageChecker extends ActiveUsageChecker {
  constructor(private readonly usages: UsageRepository) {
    super();
  }

  async hasActiveUsageByVehicle(vehicleId: string): Promise<boolean> {
    return (await this.usages.findActiveByVehicle(vehicleId)) !== null;
  }

  async hasActiveUsageByDriver(driverId: string): Promise<boolean> {
    return (await this.usages.findActiveByDriver(driverId)) !== null;
  }
}

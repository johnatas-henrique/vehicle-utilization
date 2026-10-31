import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NewUsage, Usage } from '../domain/usage.js';
import { UsageRepository } from '../domain/usage.repository.js';

@Injectable()
export class InMemoryUsageRepository extends UsageRepository {
  private readonly usages = new Map<string, Usage>();

  create(input: NewUsage): Promise<Usage> {
    const usage: Usage = {
      id: randomUUID(),
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      reason: input.reason,
      startedAt: input.startedAt,
      finishedAt: null,
    };
    this.usages.set(usage.id, usage);
    return Promise.resolve(usage);
  }

  findById(id: string): Promise<Usage | null> {
    return Promise.resolve(this.usages.get(id) ?? null);
  }

  list(): Promise<Usage[]> {
    return Promise.resolve([...this.usages.values()]);
  }

  findActiveByVehicle(vehicleId: string): Promise<Usage | null> {
    for (const usage of this.usages.values()) {
      if (usage.vehicleId === vehicleId && usage.finishedAt === null) {
        return Promise.resolve(usage);
      }
    }
    return Promise.resolve(null);
  }

  findActiveByDriver(driverId: string): Promise<Usage | null> {
    for (const usage of this.usages.values()) {
      if (usage.driverId === driverId && usage.finishedAt === null) {
        return Promise.resolve(usage);
      }
    }
    return Promise.resolve(null);
  }

  finish(id: string): Promise<Usage | null> {
    const current = this.usages.get(id);
    if (!current) {
      return Promise.resolve(null);
    }

    const finished: Usage = {
      ...current,
      finishedAt: new Date().toISOString(),
    };
    this.usages.set(id, finished);
    return Promise.resolve(finished);
  }
}

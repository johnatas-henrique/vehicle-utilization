import type { NewUsage, Usage } from './usage.js';

export abstract class UsageRepository {
  abstract create(input: NewUsage): Promise<Usage>;
  abstract findById(id: string): Promise<Usage | null>;
  abstract list(): Promise<Usage[]>;
  abstract findActiveByVehicle(vehicleId: string): Promise<Usage | null>;
  abstract findActiveByDriver(driverId: string): Promise<Usage | null>;
  abstract finish(id: string): Promise<Usage | null>;
}

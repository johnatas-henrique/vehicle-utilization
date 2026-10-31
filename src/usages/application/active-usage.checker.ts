export abstract class ActiveUsageChecker {
  abstract hasActiveUsageByVehicle(vehicleId: string): Promise<boolean>;
  abstract hasActiveUsageByDriver(driverId: string): Promise<boolean>;
}

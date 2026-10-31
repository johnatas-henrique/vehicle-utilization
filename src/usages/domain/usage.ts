export interface Usage {
  id: string;
  vehicleId: string;
  driverId: string;
  reason: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface NewUsage {
  vehicleId: string;
  driverId: string;
  reason: string;
  startedAt: string;
}

export interface UsageVehicle {
  id: string;
  plate: string;
  color: string;
  brand: string;
}

export interface UsageDriver {
  id: string;
  name: string;
}

export interface UsageView {
  id: string;
  vehicle: UsageVehicle;
  driver: UsageDriver;
  reason: string;
  startedAt: string;
  finishedAt: string | null;
}

export const toView = (
  usage: Usage,
  vehicle: UsageVehicle,
  driver: UsageDriver,
): UsageView => ({
  id: usage.id,
  vehicle: {
    id: vehicle.id,
    plate: vehicle.plate,
    color: vehicle.color,
    brand: vehicle.brand,
  },
  driver: { id: driver.id, name: driver.name },
  reason: usage.reason,
  startedAt: usage.startedAt,
  finishedAt: usage.finishedAt,
});

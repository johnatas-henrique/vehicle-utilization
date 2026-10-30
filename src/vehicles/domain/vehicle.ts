export interface Vehicle {
  id: string;
  plate: string;
  color: string;
  brand: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NewVehicle {
  plate: string;
  color: string;
  brand: string;
}

export interface VehicleChanges {
  plate?: string;
  color?: string;
  brand?: string;
}

export interface VehicleFilter {
  color?: string;
  brand?: string;
}

export interface VehicleView {
  id: string;
  plate: string;
  color: string;
  brand: string;
  createdAt: string;
  updatedAt: string;
}

export const toView = (vehicle: Vehicle): VehicleView => ({
  id: vehicle.id,
  plate: vehicle.plate,
  color: vehicle.color,
  brand: vehicle.brand,
  createdAt: vehicle.createdAt,
  updatedAt: vehicle.updatedAt,
});

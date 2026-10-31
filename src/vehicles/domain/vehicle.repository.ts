import type {
  NewVehicle,
  Vehicle,
  VehicleChanges,
  VehicleFilter,
} from './vehicle.js';

export abstract class VehicleRepository {
  abstract create(input: NewVehicle): Promise<Vehicle>;
  abstract findById(id: string): Promise<Vehicle | null>;
  // Regular reads hide soft deleted records. The usage listing needs the opposite:
  // it must still show the plate of a vehicle deleted after a finished usage.
  abstract findForHistory(id: string): Promise<Vehicle | null>;
  abstract findByPlate(plate: string): Promise<Vehicle | null>;
  abstract list(filter: VehicleFilter): Promise<Vehicle[]>;
  abstract update(id: string, changes: VehicleChanges): Promise<Vehicle | null>;
  abstract softDelete(id: string): Promise<boolean>;
}

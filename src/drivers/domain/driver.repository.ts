import type {
  Driver,
  DriverChanges,
  DriverFilter,
  NewDriver,
} from './driver.js';

export abstract class DriverRepository {
  abstract create(input: NewDriver): Promise<Driver>;
  abstract findById(id: string): Promise<Driver | null>;
  abstract findForHistory(id: string): Promise<Driver | null>;
  abstract list(filter: DriverFilter): Promise<Driver[]>;
  abstract update(id: string, changes: DriverChanges): Promise<Driver | null>;
  abstract softDelete(id: string): Promise<boolean>;
}

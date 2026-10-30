export interface Driver {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NewDriver {
  name: string;
}

export interface DriverChanges {
  name?: string;
}

export interface DriverFilter {
  name?: string;
}

export interface DriverView {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const toView = (driver: Driver): DriverView => ({
  id: driver.id,
  name: driver.name,
  createdAt: driver.createdAt,
  updatedAt: driver.updatedAt,
});

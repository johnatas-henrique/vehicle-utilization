import { DriversService } from '../../drivers/application/drivers.service.js';
import { InMemoryDriverRepository } from '../../drivers/infra/in-memory-driver.repository.js';
import { VehiclesService } from '../../vehicles/application/vehicles.service.js';
import { InMemoryVehicleRepository } from '../../vehicles/infra/in-memory-vehicle.repository.js';
import { InMemoryUsageRepository } from '../infra/in-memory-usage.repository.js';
import { ActiveUsageChecker } from './active-usage.checker.js';
import { RepositoryActiveUsageChecker } from './repository-active-usage.checker.js';
import { UsagesService } from './usages.service.js';

interface Fixture {
  service: UsagesService;
  usages: InMemoryUsageRepository;
  vehicles: VehiclesService;
  drivers: DriversService;
  checker: ActiveUsageChecker;
}

const buildFixture = (): Fixture => {
  const usageRepository = new InMemoryUsageRepository();
  const checker = new RepositoryActiveUsageChecker(usageRepository);
  const vehicles = new VehiclesService(
    new InMemoryVehicleRepository(),
    checker,
  );
  const drivers = new DriversService(new InMemoryDriverRepository(), checker);
  const service = new UsagesService(usageRepository, vehicles, drivers);

  return { service, usages: usageRepository, vehicles, drivers, checker };
};

const createVehicle = (vehicles: VehiclesService, plate: string) =>
  vehicles.create({ plate, color: 'Azul', brand: 'Fiat' });

const createDriver = (drivers: DriversService, name: string) =>
  drivers.create({ name });

describe('UsagesService', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture();
  });

  it('creates a usage and returns the joined view', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');

    const created = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Visita a cliente',
    });

    expect(created).toMatchObject({
      vehicle: {
        id: vehicle.id,
        plate: 'ABC1D23',
        color: 'Azul',
        brand: 'Fiat',
      },
      driver: { id: driver.id, name: 'João da Silva' },
      reason: 'Visita a cliente',
      finishedAt: null,
    });
    expect(created.startedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('normalizes a startedAt with offset to UTC', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');

    const created = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Visita a cliente',
      startedAt: '2026-01-01T10:00:00-03:00',
    });

    expect(created.startedAt).toBe('2026-01-01T13:00:00.000Z');
  });

  it('rejects a startedAt in the future with 400 USAGE_START_IN_FUTURE', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');
    const future = new Date(Date.now() + 60_000).toISOString();

    await expect(
      fixture.service.create({
        vehicleId: vehicle.id,
        driverId: driver.id,
        reason: 'Visita a cliente',
        startedAt: future,
      }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'USAGE_START_IN_FUTURE' },
    });
    await expect(fixture.service.list()).resolves.toHaveLength(0);
  });

  it('rejects an unknown vehicle with 404', async () => {
    const driver = await createDriver(fixture.drivers, 'João da Silva');

    await expect(
      fixture.service.create({
        vehicleId: '2a7f1d9e-0000-4000-8000-000000000000',
        driverId: driver.id,
        reason: 'Visita a cliente',
      }),
    ).rejects.toMatchObject({ status: 404, response: { code: 'NOT_FOUND' } });
  });

  it('rejects an unknown driver with 404', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');

    await expect(
      fixture.service.create({
        vehicleId: vehicle.id,
        driverId: '2a7f1d9e-0000-4000-8000-000000000000',
        reason: 'Visita a cliente',
      }),
    ).rejects.toMatchObject({ status: 404, response: { code: 'NOT_FOUND' } });
  });

  it('rejects a vehicle that is already in use with 409 VEHICLE_IN_USE', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const first = await createDriver(fixture.drivers, 'João da Silva');
    const second = await createDriver(fixture.drivers, 'Maria Souza');

    await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: first.id,
      reason: 'Primeira',
    });

    await expect(
      fixture.service.create({
        vehicleId: vehicle.id,
        driverId: second.id,
        reason: 'Segunda',
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'VEHICLE_IN_USE' },
    });
  });

  it('rejects a driver already using a vehicle with 409 DRIVER_IN_USE', async () => {
    const firstVehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const secondVehicle = await createVehicle(fixture.vehicles, 'XYZ9Z99');
    const driver = await createDriver(fixture.drivers, 'João da Silva');

    await fixture.service.create({
      vehicleId: firstVehicle.id,
      driverId: driver.id,
      reason: 'Primeira',
    });

    await expect(
      fixture.service.create({
        vehicleId: secondVehicle.id,
        driverId: driver.id,
        reason: 'Segunda',
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'DRIVER_IN_USE' },
    });
  });

  it('allows the same vehicle and driver again after finishing', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');

    const first = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Primeira',
    });
    await fixture.service.finish(first.id);

    await expect(
      fixture.service.create({
        vehicleId: vehicle.id,
        driverId: driver.id,
        reason: 'Segunda',
      }),
    ).resolves.toMatchObject({ finishedAt: null });
    await expect(fixture.service.list()).resolves.toHaveLength(2);
  });

  it('finishes a usage and stores finishedAt', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');
    const created = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Visita a cliente',
    });

    const finished = await fixture.service.finish(created.id);

    expect(finished.finishedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('rejects finishing the same usage twice with 409 USAGE_ALREADY_FINISHED', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');
    const created = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Visita a cliente',
    });
    await fixture.service.finish(created.id);

    await expect(fixture.service.finish(created.id)).rejects.toMatchObject({
      status: 409,
      response: { code: 'USAGE_ALREADY_FINISHED' },
    });
  });

  it('rejects finishing an unknown usage with 404', async () => {
    await expect(
      fixture.service.finish('2a7f1d9e-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({ status: 404, response: { code: 'NOT_FOUND' } });
  });

  it('keeps history readable after the vehicle and driver are removed', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');
    const created = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Visita a cliente',
    });
    await fixture.service.finish(created.id);

    await fixture.vehicles.remove(vehicle.id);
    await fixture.drivers.remove(driver.id);

    const listed = await fixture.service.list();

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      vehicle: { plate: 'ABC1D23' },
      driver: { name: 'João da Silva' },
    });
  });

  it('reports an active usage to the checker used by the resource deletion', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');

    await expect(
      fixture.checker.hasActiveUsageByVehicle(vehicle.id),
    ).resolves.toBe(false);

    const created = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Visita a cliente',
    });

    await expect(
      fixture.checker.hasActiveUsageByVehicle(vehicle.id),
    ).resolves.toBe(true);
    await expect(
      fixture.checker.hasActiveUsageByDriver(driver.id),
    ).resolves.toBe(true);

    await fixture.service.finish(created.id);

    await expect(
      fixture.checker.hasActiveUsageByVehicle(vehicle.id),
    ).resolves.toBe(false);
  });

  it('blocks deleting a vehicle that is in use through the resource service', async () => {
    const vehicle = await createVehicle(fixture.vehicles, 'ABC1D23');
    const driver = await createDriver(fixture.drivers, 'João da Silva');

    const created = await fixture.service.create({
      vehicleId: vehicle.id,
      driverId: driver.id,
      reason: 'Visita a cliente',
    });

    await expect(fixture.vehicles.remove(vehicle.id)).rejects.toMatchObject({
      status: 409,
      response: { code: 'VEHICLE_IN_USE' },
    });
    await expect(fixture.drivers.remove(driver.id)).rejects.toMatchObject({
      status: 409,
      response: { code: 'DRIVER_IN_USE' },
    });

    await fixture.service.finish(created.id);

    await expect(fixture.vehicles.remove(vehicle.id)).resolves.toBeUndefined();
    await expect(fixture.drivers.remove(driver.id)).resolves.toBeUndefined();
  });
});

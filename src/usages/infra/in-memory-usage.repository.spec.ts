import type { NewUsage } from '../domain/usage.js';
import { InMemoryUsageRepository } from './in-memory-usage.repository.js';

const input: NewUsage = {
  vehicleId: 'vehicle-1',
  driverId: 'driver-1',
  reason: 'Visita a cliente',
  startedAt: '2026-01-01T13:00:00.000Z',
};

describe('InMemoryUsageRepository', () => {
  let repository: InMemoryUsageRepository;

  beforeEach(() => {
    repository = new InMemoryUsageRepository();
  });

  it('creates an open usage with a generated id', async () => {
    const created = await repository.create(input);

    expect(created).toMatchObject({
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      reason: 'Visita a cliente',
      startedAt: '2026-01-01T13:00:00.000Z',
      finishedAt: null,
    });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('returns null for an unknown id', async () => {
    await expect(
      repository.findById('2a7f1d9e-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('lists every usage, open or finished', async () => {
    const first = await repository.create(input);
    await repository.create(input);
    await repository.finish(first.id);

    await expect(repository.list()).resolves.toHaveLength(2);
  });

  it('returns the active usage by vehicle and by driver', async () => {
    const created = await repository.create(input);

    await expect(
      repository.findActiveByVehicle('vehicle-1'),
    ).resolves.toMatchObject({ id: created.id });
    await expect(
      repository.findActiveByDriver('driver-1'),
    ).resolves.toMatchObject({ id: created.id });
    await expect(
      repository.findActiveByVehicle('vehicle-2'),
    ).resolves.toBeNull();
    await expect(repository.findActiveByDriver('driver-2')).resolves.toBeNull();
  });

  it('stops reporting a usage as active once it is finished', async () => {
    const created = await repository.create(input);
    await repository.finish(created.id);

    await expect(
      repository.findActiveByVehicle('vehicle-1'),
    ).resolves.toBeNull();
    await expect(repository.findActiveByDriver('driver-1')).resolves.toBeNull();
  });

  it('keeps startedAt and stores finishedAt on finish', async () => {
    const created = await repository.create(input);

    const finished = await repository.finish(created.id);

    expect(finished).toMatchObject({
      startedAt: '2026-01-01T13:00:00.000Z',
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
    });
    expect(finished?.finishedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('returns null when finishing an unknown id', async () => {
    await expect(
      repository.finish('2a7f1d9e-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('allows two open usages for different vehicles and drivers', async () => {
    await repository.create(input);
    await repository.create({
      ...input,
      vehicleId: 'vehicle-2',
      driverId: 'driver-2',
    });

    await expect(repository.list()).resolves.toHaveLength(2);
  });
});

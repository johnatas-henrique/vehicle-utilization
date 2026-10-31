import { NotFoundException } from '@nestjs/common';
import { ActiveUsageChecker } from '../../usages/application/active-usage.checker.js';
import { InMemoryDriverRepository } from '../infra/in-memory-driver.repository.js';
import { DriversService } from './drivers.service.js';

class StubActiveUsageChecker extends ActiveUsageChecker {
  readonly busyDrivers = new Set<string>();

  hasActiveUsageByVehicle(): Promise<boolean> {
    return Promise.resolve(false);
  }

  hasActiveUsageByDriver(driverId: string): Promise<boolean> {
    return Promise.resolve(this.busyDrivers.has(driverId));
  }
}

describe('DriversService', () => {
  let service: DriversService;
  let checker: StubActiveUsageChecker;

  beforeEach(() => {
    checker = new StubActiveUsageChecker();
    service = new DriversService(new InMemoryDriverRepository(), checker);
  });

  it('creates a driver and returns it without the deletedAt field', async () => {
    const created = await service.create({ name: 'João da Silva' });

    expect(created).toEqual({
      id: expect.any(String) as string,
      name: 'João da Silva',
      createdAt: expect.any(String) as string,
      updatedAt: expect.any(String) as string,
    });
    expect(created).not.toHaveProperty('deletedAt');
  });

  it('stores timestamps in UTC ISO format', async () => {
    const created = await service.create({ name: 'João da Silva' });

    expect(created.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(created.updatedAt).toBe(created.createdAt);
  });

  it('allows two drivers with the same name', async () => {
    const first = await service.create({ name: 'João da Silva' });
    const second = await service.create({ name: 'João da Silva' });

    expect(first.id).not.toBe(second.id);
    await expect(service.list({})).resolves.toHaveLength(2);
  });

  it('rejects an unknown id with 404 NOT_FOUND', async () => {
    await expect(
      service.getById('2a7f1d9e-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' },
    });
  });

  it('filters by name without accents and without case', async () => {
    await service.create({ name: 'João da Silva' });
    await service.create({ name: 'José da Silva' });
    await service.create({ name: 'Maria Souza' });

    await expect(service.list({ name: 'joao' })).resolves.toHaveLength(1);
    await expect(service.list({ name: 'JOAO' })).resolves.toHaveLength(1);
    await expect(service.list({ name: 'JOÃO' })).resolves.toHaveLength(1);
    await expect(service.list({ name: 'jose' })).resolves.toHaveLength(1);
    await expect(service.list({ name: 'José' })).resolves.toHaveLength(1);
    await expect(service.list({ name: 'silva' })).resolves.toHaveLength(2);
    await expect(service.list({ name: 'SÍLVA' })).resolves.toHaveLength(2);
    await expect(service.list({ name: 'maria' })).resolves.toHaveLength(1);
    await expect(service.list({ name: 'pedro' })).resolves.toHaveLength(0);
  });

  it('updates only the provided fields', async () => {
    const created = await service.create({ name: 'João da Silva' });

    const updated = await service.update(created.id, { name: 'João Souza' });

    expect(updated.name).toBe('João Souza');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(created.updatedAt),
    );
  });

  it('removes a driver so it is no longer retrieveable or listed', async () => {
    const created = await service.create({ name: 'João da Silva' });

    await service.remove(created.id);

    await expect(service.getById(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.list({})).resolves.toHaveLength(0);
  });

  it('rejects removing the same driver twice', async () => {
    const created = await service.create({ name: 'João da Silva' });

    await service.remove(created.id);

    await expect(service.remove(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects updating a driver that was removed', async () => {
    const created = await service.create({ name: 'João da Silva' });
    await service.remove(created.id);

    await expect(
      service.update(created.id, { name: 'Outro Nome' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects removing a driver with an active usage with 409 DRIVER_IN_USE', async () => {
    const created = await service.create({ name: 'João da Silva' });
    checker.busyDrivers.add(created.id);

    await expect(service.remove(created.id)).rejects.toMatchObject({
      status: 409,
      response: { code: 'DRIVER_IN_USE' },
    });
    await expect(service.getById(created.id)).resolves.toMatchObject({
      id: created.id,
    });
  });

  it('removes the driver once the usage is no longer active', async () => {
    const created = await service.create({ name: 'João da Silva' });
    checker.busyDrivers.add(created.id);
    checker.busyDrivers.delete(created.id);

    await service.remove(created.id);

    await expect(service.getById(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('finds a removed driver when resolving history', async () => {
    const created = await service.create({ name: 'João da Silva' });
    await service.remove(created.id);

    await expect(service.getById(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.findForHistory(created.id)).resolves.toMatchObject({
      name: 'João da Silva',
    });
    await expect(
      service.findForHistory('2a7f1d9e-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });
});

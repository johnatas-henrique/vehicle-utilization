import { ConflictException, NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { InMemoryVehicleRepository } from '../infra/in-memory-vehicle.repository.js';

describe('VehiclesService', () => {
  let service: VehiclesService;

  beforeEach(() => {
    service = new VehiclesService(new InMemoryVehicleRepository());
  });

  it('creates a vehicle and returns it without the deletedAt field', async () => {
    const created = await service.create({
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Volkswagen',
    });

    expect(created).toEqual({
      id: expect.any(String) as string,
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Volkswagen',
      createdAt: expect.any(String) as string,
      updatedAt: expect.any(String) as string,
    });
    expect(created).not.toHaveProperty('deletedAt');
  });

  it('rejects a duplicate plate with 409 VEHICLE_PLATE_TAKEN', async () => {
    await service.create({ plate: 'ABC1D23', color: 'Azul', brand: 'Fiat' });

    await expect(
      service.create({ plate: 'ABC1D23', color: 'Preto', brand: 'Fiat' }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'VEHICLE_PLATE_TAKEN' },
    });
  });

  it('treats plates as equal regardless of case and surrounding spaces', async () => {
    await service.create({ plate: 'ABC1D23', color: 'Azul', brand: 'Fiat' });

    await expect(
      service.create({ plate: '  abc1d23 ', color: 'Preto', brand: 'Fiat' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an unknown id with 404 NOT_FOUND', async () => {
    await expect(
      service.getById('2a7f1d9e-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' },
    });
  });

  it('updates only the provided fields', async () => {
    const created = await service.create({
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    const updated = await service.update(created.id, { color: 'Verde' });

    expect(updated.color).toBe('Verde');
    expect(updated.brand).toBe('Fiat');
    expect(updated.plate).toBe('ABC1D23');
  });

  it('rejects changing a plate to one that already belongs to another vehicle', async () => {
    await service.create({ plate: 'ABC1D23', color: 'Azul', brand: 'Fiat' });
    const second = await service.create({
      plate: 'XYZ9Z99',
      color: 'Preto',
      brand: 'Fiat',
    });

    await expect(
      service.update(second.id, { plate: 'ABC1D23' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts keeping the same plate on update', async () => {
    const created = await service.create({
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    const updated = await service.update(created.id, {
      plate: 'abc1d23',
      color: 'Verde',
    });

    expect(updated.color).toBe('Verde');
  });

  it('filters by color and brand, case and accents insensitive', async () => {
    await service.create({
      plate: 'ABC1D23',
      color: 'Azul Metálico',
      brand: 'Volkswagen',
    });
    await service.create({
      plate: 'XYZ9Z99',
      color: 'Vermelho',
      brand: 'Fiat',
    });

    await expect(service.list({ color: 'metalico' })).resolves.toHaveLength(1);
    await expect(service.list({ color: 'METÁLICO' })).resolves.toHaveLength(1);
    await expect(service.list({ brand: 'fiat' })).resolves.toHaveLength(1);
    await expect(
      service.list({ color: 'azul', brand: 'volks' }),
    ).resolves.toHaveLength(1);
    await expect(
      service.list({ color: 'azul', brand: 'fiat' }),
    ).resolves.toHaveLength(0);
  });

  it('removes a vehicle so it is no longer retrieveable or listed', async () => {
    const created = await service.create({
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    await service.remove(created.id);

    await expect(service.getById(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.list({})).resolves.toHaveLength(0);
  });

  it('rejects removing the same vehicle twice', async () => {
    const created = await service.create({
      plate: 'ABC1D23',
      color: 'Azul',
      brand: 'Fiat',
    });

    await service.remove(created.id);

    await expect(service.remove(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

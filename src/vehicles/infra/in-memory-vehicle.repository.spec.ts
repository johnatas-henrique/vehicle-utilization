import type { NewVehicle } from '../domain/vehicle.js';
import { InMemoryVehicleRepository } from './in-memory-vehicle.repository.js';

const input: NewVehicle = { plate: 'ABC1D23', color: 'Azul', brand: 'Fiat' };

describe('InMemoryVehicleRepository', () => {
  let repository: InMemoryVehicleRepository;

  beforeEach(() => {
    repository = new InMemoryVehicleRepository();
  });

  it('generates an id and UTC timestamps on create', async () => {
    const created = await repository.create(input);

    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(created.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(created.updatedAt).toBe(created.createdAt);
    expect(created.deletedAt).toBeNull();
  });

  it('finds a vehicle by plate regardless of case and spaces', async () => {
    await repository.create(input);

    await expect(repository.findByPlate('abc1d23')).resolves.toMatchObject({
      plate: 'ABC1D23',
    });
    await expect(repository.findByPlate('  ABC1D23  ')).resolves.toMatchObject({
      plate: 'ABC1D23',
    });
    await expect(repository.findByPlate('ZZZ9Z99')).resolves.toBeNull();
  });

  it('keeps createdAt and refreshes updatedAt on update', async () => {
    const created = await repository.create(input);

    const updated = await repository.update(created.id, { color: 'Verde' });

    expect(updated).toMatchObject({
      id: created.id,
      plate: 'ABC1D23',
      color: 'Verde',
      brand: 'Fiat',
      createdAt: created.createdAt,
    });
  });

  it('returns null when updating an unknown id', async () => {
    await expect(
      repository.update('2a7f1d9e-0000-4000-8000-000000000000', {
        color: 'Verde',
      }),
    ).resolves.toBeNull();
  });

  it('returns null when updating a deleted vehicle', async () => {
    const created = await repository.create(input);
    await repository.softDelete(created.id);

    await expect(
      repository.update(created.id, { color: 'Verde' }),
    ).resolves.toBeNull();
  });

  it('returns false when deleting an unknown id', async () => {
    await expect(
      repository.softDelete('2a7f1d9e-0000-4000-8000-000000000000'),
    ).resolves.toBe(false);
  });

  it('returns false when deleting the same vehicle twice', async () => {
    const created = await repository.create(input);

    await expect(repository.softDelete(created.id)).resolves.toBe(true);
    await expect(repository.softDelete(created.id)).resolves.toBe(false);
  });

  it('hides a deleted vehicle from findById, list and findByPlate', async () => {
    const created = await repository.create(input);
    await repository.softDelete(created.id);

    await expect(repository.findById(created.id)).resolves.toBeNull();
    await expect(repository.list({})).resolves.toHaveLength(0);
    await expect(repository.findByPlate('ABC1D23')).resolves.toBeNull();
  });

  it('keeps a deleted vehicle reachable through findForHistory', async () => {
    const created = await repository.create(input);
    await repository.softDelete(created.id);

    await expect(repository.findForHistory(created.id)).resolves.toMatchObject({
      id: created.id,
      plate: 'ABC1D23',
    });
    await expect(
      repository.findForHistory('2a7f1d9e-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('filters the list by color and brand with normalization', async () => {
    await repository.create({
      plate: 'ABC1D23',
      color: 'Azul Metálico',
      brand: 'Volkswagen',
    });
    await repository.create({
      plate: 'XYZ9Z99',
      color: 'Prata',
      brand: 'Fiat',
    });

    await expect(repository.list({})).resolves.toHaveLength(2);
    await expect(repository.list({ color: 'METÁLICO' })).resolves.toHaveLength(
      1,
    );
    await expect(
      repository.list({ color: 'azul', brand: 'volks' }),
    ).resolves.toHaveLength(1);
    await expect(
      repository.list({ color: 'azul', brand: 'fiat' }),
    ).resolves.toHaveLength(0);
  });
});

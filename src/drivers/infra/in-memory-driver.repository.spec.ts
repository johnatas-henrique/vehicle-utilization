import { InMemoryDriverRepository } from './in-memory-driver.repository.js';

describe('InMemoryDriverRepository', () => {
  let repository: InMemoryDriverRepository;

  beforeEach(() => {
    repository = new InMemoryDriverRepository();
  });

  it('generates an id and UTC timestamps on create', async () => {
    const created = await repository.create({ name: 'João da Silva' });

    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(created.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(created.updatedAt).toBe(created.createdAt);
    expect(created.deletedAt).toBeNull();
  });

  it('keeps createdAt and refreshes updatedAt on update', async () => {
    const created = await repository.create({ name: 'João da Silva' });

    const updated = await repository.update(created.id, {
      name: 'João Souza',
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: 'João Souza',
      createdAt: created.createdAt,
    });
  });

  it('returns null when updating an unknown id', async () => {
    await expect(
      repository.update('2a7f1d9e-0000-4000-8000-000000000000', {
        name: 'Outro Nome',
      }),
    ).resolves.toBeNull();
  });

  it('returns null when updating a deleted driver', async () => {
    const created = await repository.create({ name: 'João da Silva' });
    await repository.softDelete(created.id);

    await expect(
      repository.update(created.id, { name: 'Outro Nome' }),
    ).resolves.toBeNull();
  });

  it('returns false when deleting an unknown id', async () => {
    await expect(
      repository.softDelete('2a7f1d9e-0000-4000-8000-000000000000'),
    ).resolves.toBe(false);
  });

  it('returns false when deleting the same driver twice', async () => {
    const created = await repository.create({ name: 'João da Silva' });

    await expect(repository.softDelete(created.id)).resolves.toBe(true);
    await expect(repository.softDelete(created.id)).resolves.toBe(false);
  });

  it('hides a deleted driver from findById and list', async () => {
    const created = await repository.create({ name: 'João da Silva' });
    await repository.softDelete(created.id);

    await expect(repository.findById(created.id)).resolves.toBeNull();
    await expect(repository.list({})).resolves.toHaveLength(0);
  });

  it('keeps a deleted driver reachable through findForHistory', async () => {
    const created = await repository.create({ name: 'João da Silva' });
    await repository.softDelete(created.id);

    await expect(repository.findForHistory(created.id)).resolves.toMatchObject({
      id: created.id,
      name: 'João da Silva',
    });
    await expect(
      repository.findForHistory('2a7f1d9e-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('filters the list by name with normalization', async () => {
    await repository.create({ name: 'João da Silva' });
    await repository.create({ name: 'José da Silva' });
    await repository.create({ name: 'Maria Souza' });

    await expect(repository.list({ name: 'JOÃO' })).resolves.toHaveLength(1);
    await expect(repository.list({ name: 'silva' })).resolves.toHaveLength(2);
    await expect(repository.list({ name: 'SÍLVA' })).resolves.toHaveLength(2);
    await expect(repository.list({ name: 'pedro' })).resolves.toHaveLength(0);
  });
});

import { MemoryStore } from '../src/services/storage/kv';
import { BACKUP_KEY, QUARANTINE_PREFIX, SAVE_KEY, SaveRepository } from '../src/services/storage/saveRepository';
import { defaultSave, migrate, SAVE_VERSION, sanitize, SaveFormatError } from '../src/services/storage/saveSchema';

describe('save schema', () => {
  test('migrates a v1 save field by field', () => {
    const s = migrate({ version: 1, coins: 75, completed: [1, 2, 3], settings: { music: false }, owned: ['skin_mint'] });
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.coins).toBe(75);
    expect(s.rooms.r003.completed).toBe(true);
    expect(s.highestUnlocked).toBe(4);
    expect(s.settings.music).toBe(false);
    expect(s.settings.sound).toBe(true);
    expect(s.cosmetics.owned).toContain('skin_mint');
    expect(s.tutorialCompleted).toBe(true);
  });

  test('rejects saves from a newer app version and non-objects', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow(SaveFormatError);
    expect(() => migrate('nope')).toThrow(SaveFormatError);
  });

  test('sanitize repairs invalid values but keeps valid ones', () => {
    const raw = { ...defaultSave(), coins: -50, highestUnlocked: 'x', settings: { sound: 'yes', music: false } } as unknown as Parameters<typeof sanitize>[0];
    const s = sanitize(raw);
    expect(s.coins).toBe(0);
    expect(s.highestUnlocked).toBeGreaterThanOrEqual(1);
    expect(s.settings.sound).toBe(true);
    expect(s.settings.music).toBe(false);
  });
});

describe('save repository', () => {
  test('round-trips and keeps a backup', async () => {
    const store = new MemoryStore();
    const repo = new SaveRepository(store);
    expect((await repo.load()).outcome).toBe('new');
    await repo.save({ ...defaultSave(), coins: 42 });
    const again = await new SaveRepository(store).load();
    expect(again.outcome).toBe('loaded');
    expect(again.save.coins).toBe(42);
    expect(await store.getItem(BACKUP_KEY)).not.toBeNull();
  });

  test('corrupt save is quarantined and the backup restored', async () => {
    const store = new MemoryStore();
    await store.setItem(BACKUP_KEY, JSON.stringify({ ...defaultSave(), coins: 9 }));
    await store.setItem(SAVE_KEY, '{not json');
    const res = await new SaveRepository(store).load();
    expect(res.outcome).toBe('restoredBackup');
    expect(res.save.coins).toBe(9);
    const keys = [...store.data.keys()];
    expect(keys.some((k) => k.startsWith(QUARANTINE_PREFIX))).toBe(true);
  });

  test('corrupt save without a backup resets safely', async () => {
    const store = new MemoryStore();
    await store.setItem(SAVE_KEY, '[]');
    const res = await new SaveRepository(store).load();
    expect(res.outcome).toBe('resetAfterCorruption');
    expect(res.save.coins).toBe(defaultSave().coins);
  });

  test('rapid writes collapse to the latest state', async () => {
    const store = new MemoryStore();
    const repo = new SaveRepository(store);
    await Promise.all([1, 2, 3, 4, 5].map((c) => repo.save({ ...defaultSave(), coins: c })));
    expect(JSON.parse((await store.getItem(SAVE_KEY))!).coins).toBe(5);
  });

  test('reset keeps the previous save recoverable', async () => {
    const store = new MemoryStore();
    const repo = new SaveRepository(store);
    const fresh = await repo.reset({ ...defaultSave(), coins: 500 });
    expect(fresh.coins).toBe(defaultSave().coins);
    const keys = [...store.data.keys()];
    expect(keys.some((k) => k.includes('reset'))).toBe(true);
  });
});

// Loads and persists SaveData. Corrupt or unreadable saves are never silently discarded:
// the raw text is preserved under a quarantine key and the last known-good backup is used.
import { log } from '../../utils/log';
import type { KeyValueStore } from './kv';
import { defaultSave, migrate, type SaveData } from './saveSchema';

export const SAVE_KEY = 'orl.save';
export const BACKUP_KEY = 'orl.save.backup';
export const QUARANTINE_PREFIX = 'orl.save.corrupt.';

export type LoadOutcome = 'new' | 'loaded' | 'migrated' | 'restoredBackup' | 'resetAfterCorruption';

export interface LoadResult {
  save: SaveData;
  outcome: LoadOutcome;
  error?: string;
}

function tryParse(text: string | null): { save?: SaveData; migrated?: boolean; error?: string } {
  if (text === null) return {};
  try {
    const raw = JSON.parse(text);
    const save = migrate(raw);
    return { save, migrated: raw?.version !== save.version };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export class SaveRepository {
  private writing: Promise<void> = Promise.resolve();
  private pending: SaveData | null = null;

  constructor(private store: KeyValueStore) {}

  async load(): Promise<LoadResult> {
    let mainText: string | null = null;
    try {
      mainText = await this.store.getItem(SAVE_KEY);
    } catch (e) {
      log.warn('storage', 'read failed', e);
    }
    const main = tryParse(mainText);
    if (main.save) {
      // Keep a known-good copy for recovery.
      await this.safeSet(BACKUP_KEY, JSON.stringify(main.save));
      return { save: main.save, outcome: main.migrated ? 'migrated' : 'loaded' };
    }
    if (mainText === null && !main.error) {
      const backup = tryParse(await this.safeGet(BACKUP_KEY));
      if (backup.save) return { save: backup.save, outcome: 'restoredBackup' };
      return { save: defaultSave(), outcome: 'new' };
    }
    // Main save is corrupt: quarantine it, then fall back to the backup.
    log.error('storage', 'save corrupt, quarantining', main.error);
    await this.safeSet(`${QUARANTINE_PREFIX}${Date.now()}`, mainText ?? '');
    const backup = tryParse(await this.safeGet(BACKUP_KEY));
    if (backup.save) {
      await this.safeSet(SAVE_KEY, JSON.stringify(backup.save));
      return { save: backup.save, outcome: 'restoredBackup', error: main.error };
    }
    return { save: defaultSave(), outcome: 'resetAfterCorruption', error: main.error };
  }

  /** Serialised writes; rapid successive saves collapse into the latest state. */
  save(data: SaveData): Promise<void> {
    this.pending = data;
    this.writing = this.writing.then(async () => {
      const next = this.pending;
      if (!next) return;
      this.pending = null;
      await this.safeSet(SAVE_KEY, JSON.stringify({ ...next, updatedAt: new Date().toISOString() }));
    });
    return this.writing;
  }

  async backupNow(data: SaveData) {
    await this.safeSet(BACKUP_KEY, JSON.stringify(data));
  }

  /** Explicit, user-confirmed reset. The previous save is kept as a backup. */
  async reset(previous: SaveData): Promise<SaveData> {
    await this.safeSet(`${QUARANTINE_PREFIX}reset.${Date.now()}`, JSON.stringify(previous));
    const fresh = defaultSave();
    fresh.settings = previous.settings;
    fresh.consent = previous.consent;
    await this.safeSet(SAVE_KEY, JSON.stringify(fresh));
    await this.safeSet(BACKUP_KEY, JSON.stringify(fresh));
    return fresh;
  }

  private async safeGet(k: string) {
    try {
      return await this.store.getItem(k);
    } catch (e) {
      log.warn('storage', `read ${k} failed`, e);
      return null;
    }
  }

  private async safeSet(k: string, v: string) {
    try {
      await this.store.setItem(k, v);
    } catch (e) {
      log.error('storage', `write ${k} failed`, e);
    }
  }
}

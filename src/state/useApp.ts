// Application store: persistent save data, navigation and app lifecycle.
import { create } from 'zustand';
import { adService } from '../services/ads/adService';
import { gatherConsent } from '../services/ads/consent';
import { createAdProvider } from '../services/ads/providerFactory';
import { analytics } from '../services/analytics/analytics';
import { sound } from '../services/audio/sound';
import { setHapticsEnabled } from '../services/haptics/haptics';
import { asyncStore } from '../services/storage/asyncStore';
import type { KeyValueStore } from '../services/storage/kv';
import { SaveRepository, type LoadOutcome } from '../services/storage/saveRepository';
import { defaultSave, type SaveData, type Settings } from '../services/storage/saveSchema';
import { dayKey } from '../utils/dates';
import { log } from '../utils/log';
import { noteDay, rollAdDay } from './progression';
import { backfillStars } from './mastery';

export type Route =
  | { name: 'home' }
  | { name: 'game' }
  | { name: 'levels' }
  | { name: 'rewards'; tab?: RewardsTab }
  | { name: 'settings' }
  | { name: 'privacy' }
  | { name: 'journal'; tab?: 'story' | 'witness' };

export type RewardsTab = 'shop' | 'achievements' | 'daily' | 'coins';

interface AppState {
  ready: boolean;
  save: SaveData;
  loadOutcome: LoadOutcome | null;
  notice: string | null;
  stack: Route[];
  consentRunning: boolean;
  privacyOptionsRequired: boolean;
  /** When this app launch started (for first-session timing). */
  openedAt: number;
  init(store?: KeyValueStore): Promise<void>;
  update(fn: (s: SaveData) => SaveData): void;
  setSettings(patch: Partial<Settings>): void;
  navigate(r: Route): void;
  replace(r: Route): void;
  back(): boolean;
  home(): void;
  dismissNotice(): void;
  ensureConsentAndAds(): Promise<void>;
  resetProgress(): Promise<void>;
}

let repo: SaveRepository | null = null;

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  save: defaultSave(),
  loadOutcome: null,
  notice: null,
  stack: [{ name: 'home' }],
  consentRunning: false,
  privacyOptionsRequired: false,
  openedAt: Date.now(),

  async init(store = asyncStore) {
    if (get().ready) return;
    set({ openedAt: Date.now() });
    repo = new SaveRepository(store);
    const res = await repo.load();
    const today = dayKey();
    let save = backfillStars(rollAdDay(noteDay(res.save, today), today));
    save = { ...save, stats: { ...save.stats, sessions: save.stats.sessions + 1 } };
    let notice: string | null = null;
    if (res.outcome === 'restoredBackup') notice = 'Your save could not be read, so your last backup was restored.';
    if (res.outcome === 'resetAfterCorruption') notice = 'Your save data was damaged and could not be recovered. A copy was kept for support.';
    if (res.outcome === 'restoredBackup' || res.outcome === 'resetAfterCorruption') {
      analytics.track('save_recovered', { outcome: res.outcome });
    }
    set({ ready: true, save, loadOutcome: res.outcome, notice });
    repo.save(save);
    applySettings(save.settings);
    analytics.startSession();
    analytics.track('app_open', { sessions: save.stats.sessions, rooms_completed: save.stats.roomsCompleted });
    adService.setProvider(createAdProvider());
    // New players go straight into room 1; consent is requested once onboarding is done.
    if (save.tutorialCompleted) get().ensureConsentAndAds();
  },

  update(fn) {
    const next = fn(get().save);
    if (next === get().save) return;
    set({ save: next });
    repo?.save(next);
  },

  setSettings(patch) {
    get().update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    applySettings(get().save.settings);
  },

  navigate(r) {
    set({ stack: [...get().stack, r] });
  },
  replace(r) {
    set({ stack: [...get().stack.slice(0, -1), r] });
  },
  back() {
    const st = get().stack;
    if (st.length <= 1) return false;
    set({ stack: st.slice(0, -1) });
    return true;
  },
  home() {
    set({ stack: [{ name: 'home' }] });
  },
  dismissNotice() {
    set({ notice: null });
  },

  async ensureConsentAndAds() {
    if (get().consentRunning) return;
    set({ consentRunning: true });
    try {
      const outcome = await gatherConsent();
      get().update((s) => ({
        ...s,
        consent: {
          flowCompletedAt: new Date().toISOString(),
          personalizedAds: outcome.canRequestAds && !outcome.nonPersonalized,
          attStatus: outcome.attStatus,
        },
      }));
      set({ privacyOptionsRequired: outcome.privacyOptionsRequired });
      if (outcome.canRequestAds) await adService.initialize({ nonPersonalized: outcome.nonPersonalized });
    } catch (e) {
      log.warn('consent', 'consent/ads init failed', e);
    } finally {
      set({ consentRunning: false });
    }
  },

  async resetProgress() {
    if (!repo) return;
    const fresh = await repo.reset(get().save);
    set({ save: fresh, stack: [{ name: 'home' }] });
  },
}));

function applySettings(s: Settings) {
  sound.configure({ sound: s.sound, music: s.music });
  setHapticsEnabled(s.haptics);
}

export const currentRoute = () => {
  const st = useApp.getState().stack;
  return st[st.length - 1];
};

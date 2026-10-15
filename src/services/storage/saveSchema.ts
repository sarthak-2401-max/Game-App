// Versioned save format. Every load goes through `migrate` + `sanitize`, so old, partial or
// hand-edited saves are upgraded field by field instead of being thrown away.

import type { RewardedPlacement } from '../../config/ads';
import { DEFAULT_COSMETICS, type CosmeticSlot } from '../../config/cosmetics';
import { isPowerUpId, type PowerUpId } from '../../config/powerups';

export const SAVE_VERSION = 3;

export interface RoomRecord {
  completed: boolean;
  completions: number;
  bestMoves?: number;
  /** Bitmask over the room's coin items that have ever been collected (each pays once). */
  coinsFound: number;
  firstClearAt?: string;
  attempts: number;
  rewarded: boolean; // completion reward already paid
  /** Mastery stars ever earned, as a bitmask (1 escape, 2 move target, 4 room objective). */
  stars?: number;
}

export interface DailyClaim {
  completedAt: string;
  reward: number;
  /** Best mastery result on that day's challenge (replays can improve it; they never pay again). */
  stars?: number;
  bestMoves?: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  /** Show on-screen arrow pad in addition to swipe/tap. */
  showDpad: boolean;
  /** Characters read the story aloud (device text-to-speech). Subtitles always show. */
  voiceover: boolean;
}

export interface ConsentState {
  /** Set after the consent flow has run at least once on this install. */
  flowCompletedAt?: string;
  /** Whether personalised ads may be requested (from UMP / ATT outcome). */
  personalizedAds: boolean;
  /** Last iOS App Tracking Transparency status seen. */
  attStatus?: 'granted' | 'denied' | 'undetermined' | 'restricted' | 'unavailable';
}

export interface AdLedger {
  day: string; // local date key for the counters below
  counts: Partial<Record<RewardedPlacement, number>>;
  interstitialsToday: number;
  /** Recently granted reward tokens; protects against duplicate callbacks across restarts. */
  grantedTokens: string[];
  lastInterstitialAt: number;
  lastRewardedAt: number;
  roomsSinceInterstitial: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  createdAt: string;
  updatedAt: string;
  coins: number;
  lifetimeCoins: number;
  rooms: Record<string, RoomRecord>;
  highestUnlocked: number;
  chapterBonusClaimed: number[];
  bonusRoomsUnlocked: string[];
  cosmetics: { owned: string[]; selected: Record<CosmeticSlot, string> };
  achievements: Record<string, { progress: number; unlockedAt?: string }>;
  daily: {
    claims: Record<string, DailyClaim>;
    streak: { count: number; lastDay?: string; best: number };
    /** Latest local day the app has seen; used to detect the device clock moving backwards. */
    latestDaySeen?: string;
  };
  ads: AdLedger;
  stats: {
    roomsCompleted: number;
    failures: number;
    undos: number;
    hintsUsed: number;
    sessions: number;
    firstOpenAt: string;
    playSeconds: number;
    flawlessChapterStreak: Record<number, boolean>;
    /** First session: milliseconds from app open to the first move and to the first escape. */
    firstMoveMs?: number;
    firstWinMs?: number;
  };
  tutorialCompleted: boolean;
  settings: Settings;
  consent: ConsentState;
  /** Room the player was in when the app closed, restored as "Continue". */
  lastRoom?: number;
  powerups: {
    inventory: Partial<Record<PowerUpId, number>>;
    /** Power-ups whose unlock (and starter stock) has been granted. */
    unlocked: PowerUpId[];
    used: number;
  };
  story: {
    /** Chapters whose opening story card has been shown. */
    chaptersSeen: number[];
    epilogueSeen: boolean;
  };
  /**
   * Room memory: what the player did, as named counters. Keys look like "r004.hint",
   * "o01.route.observer", "clue.c03" or "obs.w12" (a WITNESS line heard). Read only through
   * conditions that select between pre-verified content, so bad values can't break a room.
   */
  memory: { flags: Record<string, number> };
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: true,
  haptics: true,
  reducedMotion: false,
  showDpad: true,
  voiceover: true,
};

export function defaultSave(now = new Date()): SaveData {
  const iso = now.toISOString();
  return {
    version: SAVE_VERSION,
    createdAt: iso,
    updatedAt: iso,
    coins: 0,
    lifetimeCoins: 0,
    rooms: {},
    highestUnlocked: 1,
    chapterBonusClaimed: [],
    bonusRoomsUnlocked: [],
    cosmetics: { owned: Object.values(DEFAULT_COSMETICS), selected: { ...DEFAULT_COSMETICS } },
    achievements: {},
    daily: { claims: {}, streak: { count: 0, best: 0 } },
    ads: {
      day: '',
      counts: {},
      interstitialsToday: 0,
      grantedTokens: [],
      lastInterstitialAt: 0,
      lastRewardedAt: 0,
      roomsSinceInterstitial: 0,
    },
    stats: {
      roomsCompleted: 0,
      failures: 0,
      undos: 0,
      hintsUsed: 0,
      sessions: 0,
      firstOpenAt: iso,
      playSeconds: 0,
      flawlessChapterStreak: {},
    },
    tutorialCompleted: false,
    settings: { ...DEFAULT_SETTINGS },
    consent: { personalizedAds: false },
    powerups: { inventory: {}, unlocked: [], used: 0 },
    story: { chaptersSeen: [], epilogueSeen: false },
    memory: { flags: {} },
  };
}

// ---- Migrations -----------------------------------------------------------------------------

/** Shape of the first public save format (kept for migration tests and real upgrades). */
export interface SaveDataV1 {
  version: 1;
  coins: number;
  completed: number[]; // room numbers
  settings?: Partial<Settings>;
  owned?: string[];
}

type AnySave = { version?: number } & Record<string, unknown>;

const MIGRATIONS: Record<number, (s: AnySave) => AnySave> = {
  1: (old) => {
    const v1 = old as unknown as SaveDataV1;
    const base = defaultSave();
    const rooms: SaveData['rooms'] = {};
    for (const n of Array.isArray(v1.completed) ? v1.completed : []) {
      if (typeof n !== 'number' || n < 1) continue;
      rooms[`r${String(n).padStart(3, '0')}`] = {
        completed: true,
        completions: 1,
        coinsFound: 0,
        attempts: 1,
        rewarded: true,
      };
    }
    const done = Object.keys(rooms).map((k) => Number(k.slice(1)));
    return {
      ...base,
      coins: typeof v1.coins === 'number' ? v1.coins : 0,
      lifetimeCoins: typeof v1.coins === 'number' ? v1.coins : 0,
      rooms,
      highestUnlocked: Math.max(1, ...done.map((n) => n + 1)),
      settings: { ...DEFAULT_SETTINGS, ...(v1.settings ?? {}) },
      cosmetics: {
        owned: [...new Set([...base.cosmetics.owned, ...(v1.owned ?? [])])],
        selected: base.cosmetics.selected,
      },
      tutorialCompleted: done.length > 0,
      version: 2,
    } as unknown as AnySave;
  },
  // v3 adds room memory, mastery stars and daily scores. Everything else is kept as-is; stars
  // for rooms finished before v3 are back-filled once by `backfillStars` (it needs room data).
  2: (old) => ({ ...old, memory: { flags: {} }, version: 3 }),
};

export class SaveFormatError extends Error {}

export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SaveFormatError('save is not an object');
  let s = raw as AnySave;
  let v = typeof s.version === 'number' ? s.version : 1;
  if (v > SAVE_VERSION) throw new SaveFormatError(`save version ${v} is newer than this app (${SAVE_VERSION})`);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new SaveFormatError(`no migration from version ${v}`);
    s = m(s);
    v = typeof s.version === 'number' ? s.version : v + 1;
  }
  return sanitize(s);
}

const num = (v: unknown, d: number, min = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const obj = <T>(v: unknown, d: T): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : d);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const stars = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 7 ? v : undefined);

export const MEMORY_KEY = /^[a-z0-9][a-z0-9_.~-]{0,47}$/i;
const MAX_FLAGS = 4000;

/** Keeps only well-formed flags with finite, non-negative values. Anything else is dropped. */
export function sanitizeFlags(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  let n = 0;
  for (const [k, val] of Object.entries(obj<Record<string, unknown>>(v, {}))) {
    if (n >= MAX_FLAGS) break;
    if (!MEMORY_KEY.test(k) || typeof val !== 'number' || !Number.isFinite(val) || val <= 0) continue;
    out[k] = Math.min(1_000_000, Math.floor(val));
    n++;
  }
  return out;
}

/** Fills missing fields and repairs invalid values, keeping everything that is valid. */
export function sanitize(input: AnySave): SaveData {
  const d = defaultSave();
  const s = input as Partial<SaveData>;
  const rooms: SaveData['rooms'] = {};
  for (const [id, r] of Object.entries(obj(s.rooms, {} as Record<string, unknown>))) {
    const rr = obj(r, {} as Partial<RoomRecord>);
    rooms[id] = {
      completed: bool(rr.completed, false),
      completions: num(rr.completions, 0),
      bestMoves: typeof rr.bestMoves === 'number' ? rr.bestMoves : undefined,
      coinsFound: num(rr.coinsFound, 0),
      firstClearAt: typeof rr.firstClearAt === 'string' ? rr.firstClearAt : undefined,
      attempts: num(rr.attempts, 0),
      rewarded: bool(rr.rewarded, bool(rr.completed, false)),
      stars: stars(rr.stars),
    };
    if (rooms[id].stars === undefined) delete rooms[id].stars;
  }
  const cos = obj(s.cosmetics, d.cosmetics);
  const owned = [...new Set([...d.cosmetics.owned, ...strArr(cos.owned)])];
  const selected = { ...d.cosmetics.selected, ...obj(cos.selected, {}) };
  (Object.keys(selected) as CosmeticSlot[]).forEach((slot) => {
    if (!owned.includes(selected[slot])) selected[slot] = d.cosmetics.selected[slot];
  });
  const daily = obj(s.daily, d.daily);
  const ads = obj(s.ads, d.ads);
  const stats = obj(s.stats, d.stats);
  const consent = obj(s.consent, d.consent);
  return {
    version: SAVE_VERSION,
    createdAt: typeof s.createdAt === 'string' ? s.createdAt : d.createdAt,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : d.updatedAt,
    coins: Math.floor(num(s.coins, 0)),
    lifetimeCoins: Math.floor(num(s.lifetimeCoins, num(s.coins, 0))),
    rooms,
    highestUnlocked: Math.floor(num(s.highestUnlocked, 1, 1)),
    chapterBonusClaimed: (Array.isArray(s.chapterBonusClaimed) ? s.chapterBonusClaimed : []).filter((n) => typeof n === 'number'),
    bonusRoomsUnlocked: strArr(s.bonusRoomsUnlocked),
    cosmetics: { owned, selected },
    achievements: obj(s.achievements, {}),
    daily: {
      claims: (() => {
        const out: Record<string, DailyClaim> = {};
        for (const [day, c] of Object.entries(obj<Record<string, unknown>>(daily.claims, {}))) {
          const cc = obj<Partial<DailyClaim>>(c, {});
          out[day] = { completedAt: typeof cc.completedAt === 'string' ? cc.completedAt : d.createdAt, reward: num(cc.reward, 0) };
          if (stars(cc.stars) !== undefined) out[day].stars = stars(cc.stars);
          if (typeof cc.bestMoves === 'number' && cc.bestMoves > 0) out[day].bestMoves = Math.floor(cc.bestMoves);
        }
        return out;
      })(),
      streak: { ...d.daily.streak, ...obj(daily.streak, {}) },
      latestDaySeen: typeof daily.latestDaySeen === 'string' ? daily.latestDaySeen : undefined,
    },
    ads: {
      ...d.ads,
      ...ads,
      counts: obj(ads.counts, {}),
      grantedTokens: strArr(ads.grantedTokens).slice(-100),
    },
    stats: { ...d.stats, ...stats, flawlessChapterStreak: obj(stats.flawlessChapterStreak, {}) },
    tutorialCompleted: bool(s.tutorialCompleted, false),
    settings: (() => {
      const raw = obj<Record<string, unknown>>(s.settings, {});
      const out = { ...DEFAULT_SETTINGS };
      for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) out[k] = bool(raw[k], DEFAULT_SETTINGS[k]);
      return out;
    })(),
    consent: { ...d.consent, ...consent },
    lastRoom: typeof s.lastRoom === 'number' ? s.lastRoom : undefined,
    powerups: (() => {
      const p = obj<Record<string, unknown>>(s.powerups, {});
      const inventory: Partial<Record<PowerUpId, number>> = {};
      for (const [k, v] of Object.entries(obj<Record<string, unknown>>(p.inventory, {}))) {
        if (isPowerUpId(k)) inventory[k] = Math.floor(num(v, 0));
      }
      return { inventory, unlocked: strArr(p.unlocked).filter(isPowerUpId), used: Math.floor(num(p.used, 0)) };
    })(),
    story: (() => {
      const st = obj<Record<string, unknown>>(s.story, {});
      return {
        chaptersSeen: (Array.isArray(st.chaptersSeen) ? st.chaptersSeen : []).filter((n): n is number => typeof n === 'number'),
        epilogueSeen: bool(st.epilogueSeen, false),
      };
    })(),
    memory: { flags: sanitizeFlags(obj<Record<string, unknown>>(s.memory, {}).flags) },
  };
}

// Pure progression rules: rewards, unlocks, achievements, daily claims, shop and ad ledger.
// Every function takes a SaveData and returns a new one, so the rules are unit-testable and
// cannot double-grant through UI re-renders or navigation.

import { ECONOMY } from '../config/economy';
import { ACHIEVEMENTS, getAchievement } from '../config/achievements';
import { COSMETICS, getCosmetic, type CosmeticSlot } from '../config/cosmetics';
import { INTERSTITIAL_POLICY, type RewardedPlacement } from '../config/ads';
import { CAMPAIGN_SIZE, ROOMS_PER_CHAPTER, roomId } from '../game/levels';
import type { Room } from '../game/types';
import type { RoomRecord, SaveData } from '../services/storage/saveSchema';
import { POWERUP_TUNING, type PowerUpId } from '../config/powerups';
import { addPowerUp, grantChapterPowerUps, syncPowerUpUnlocks, type PowerUpGrant } from './powerups';
import { dayKey, daysBetween } from '../utils/dates';
import { sigilCount } from '../game/observer/conditions';
import { markClueFound, memoryView, noteCompletionMemory, type MemoryRun } from './memory';
import { clueFlag } from '../game/observer/clues';
import { starCount, totalStars } from './mastery';

export interface RewardLine {
  label: string;
  amount: number;
  kind: 'base' | 'coin' | 'chapter' | 'achievement' | 'daily' | 'streak' | 'ad';
}

export interface CompletionResult {
  save: SaveData;
  rewards: RewardLine[];
  achievements: string[];
  chapterCompleted?: number;
  firstClear: boolean;
  /** Base reward that an optional "double reward" ad would add again (0 = not eligible). */
  doubleEligibleAmount: number;
  /** Power-ups unlocked or earned by this completion. */
  powerups: PowerUpGrant[];
  /** Stars this run earned, and the room's best (union) after it. */
  stars: number;
  bestStars: number;
}

export interface RunStats {
  moves: number;
  usedUndo: boolean;
  /** Bitmask over room.items indices collected during this run. */
  itemsTaken: number;
  /** Failed attempts on this room since it was opened. */
  failedAttempts: number;
  /** Shortest known solution (from the solver), for the efficiency achievement. */
  parMoves?: number;
  /** Mastery stars earned by this run (see mastery.ts). */
  stars?: number;
  /** Room-memory facts about this run. */
  memory?: MemoryRun;
}

const emptyRecord = (): RoomRecord => ({ completed: false, completions: 0, coinsFound: 0, attempts: 0, rewarded: false });

export const roomRecord = (s: SaveData, id: string) => s.rooms[id] ?? emptyRecord();

export const isRoomUnlocked = (s: SaveData, n: number) => n >= 1 && n <= Math.min(s.highestUnlocked, CAMPAIGN_SIZE);

export const completedCount = (s: SaveData) => Object.entries(s.rooms).filter(([id, r]) => id.startsWith('r') && r.completed).length;

export function chapterProgress(s: SaveData, chapter: number): number {
  let n = 0;
  for (let i = 1; i <= ROOMS_PER_CHAPTER; i++) {
    if (s.rooms[roomId((chapter - 1) * ROOMS_PER_CHAPTER + i)]?.completed) n++;
  }
  return n;
}

/** The room "Continue" should open: the last room played if unfinished, else the next one. */
export function continueRoom(s: SaveData): number {
  if (s.lastRoom && isRoomUnlocked(s, s.lastRoom) && !s.rooms[roomId(s.lastRoom)]?.completed) return s.lastRoom;
  for (let n = 1; n <= Math.min(s.highestUnlocked, CAMPAIGN_SIZE); n++) {
    if (!s.rooms[roomId(n)]?.completed) return n;
  }
  return Math.min(s.highestUnlocked, CAMPAIGN_SIZE);
}

function addCoins(s: SaveData, amount: number): SaveData {
  if (amount <= 0) return s;
  return { ...s, coins: s.coins + amount, lifetimeCoins: s.lifetimeCoins + amount };
}

function cosmeticsOwnedBeyondDefault(s: SaveData): number {
  return s.cosmetics.owned.filter((id) => (getCosmetic(id)?.price ?? 0) > 0 || getCosmetic(id)?.achievement).length;
}

/** Evaluates counter-style achievements and unlocks any whose condition is now met. */
export function evaluateAchievements(
  save: SaveData,
  flags: Partial<Record<string, boolean>> = {},
  now = new Date(),
): { save: SaveData; unlocked: string[]; rewards: RewardLine[] } {
  let s = save;
  const unlocked: string[] = [];
  const rewards: RewardLine[] = [];
  const progressFor: Record<string, number> = {
    first_escape: s.rooms[roomId(1)]?.completed ? 1 : 0,
    rooms_5: completedCount(s),
    rooms_25: completedCount(s),
    rooms_50: completedCount(s),
    campaign_complete: completedCount(s),
    chapter_clear: s.chapterBonusClaimed.length > 0 ? 1 : 0,
    streak_3: s.daily.streak.best,
    streak_7: s.daily.streak.best,
    collector: cosmeticsOwnedBeyondDefault(s),
    daily_first: Object.keys(s.daily.claims).length > 0 ? 1 : 0,
    sigils_5: sigilCount(memoryView(s)),
    sigils_10: sigilCount(memoryView(s)),
    stars_100: totalStars(s),
    stars_250: totalStars(s),
    daily_master: Object.values(s.daily.claims).some((c) => starCount(c.stars) === 3) ? 1 : 0,
  };
  for (const def of ACHIEVEMENTS) {
    const cur = s.achievements[def.id] ?? { progress: 0 };
    if (cur.unlockedAt) continue;
    const progress = Math.min(def.target, Math.max(cur.progress, progressFor[def.id] ?? 0, flags[def.id] ? def.target : 0));
    if (progress === cur.progress && !(progress >= def.target)) continue;
    const next = { progress, unlockedAt: progress >= def.target ? now.toISOString() : undefined };
    s = { ...s, achievements: { ...s.achievements, [def.id]: next } };
    if (next.unlockedAt) {
      unlocked.push(def.id);
      rewards.push({ label: def.name, amount: def.reward, kind: 'achievement' });
      s = addCoins(s, def.reward);
      // Cosmetics tied to this achievement become owned.
      const extra = COSMETICS.filter((c) => c.achievement === def.id).map((c) => c.id);
      if (extra.length) {
        s = { ...s, cosmetics: { ...s.cosmetics, owned: [...new Set([...s.cosmetics.owned, ...extra])] } };
      }
    }
  }
  // Owning achievement cosmetics can itself complete "collector".
  if (unlocked.length && !s.achievements.collector?.unlockedAt && cosmeticsOwnedBeyondDefault(s) >= (getAchievement('collector')?.target ?? 5)) {
    const more = evaluateAchievements(s, {}, now);
    return { save: more.save, unlocked: [...unlocked, ...more.unlocked], rewards: [...rewards, ...more.rewards] };
  }
  return { save: s, unlocked, rewards };
}

export function recordAttempt(save: SaveData, room: Room): SaveData {
  const rec = roomRecord(save, room.id);
  return { ...save, rooms: { ...save.rooms, [room.id]: { ...rec, attempts: rec.attempts + 1 } }, lastRoom: room.chapter > 0 ? room.index : save.lastRoom };
}

export function recordFailure(save: SaveData, room: Room): SaveData {
  const flawless = { ...save.stats.flawlessChapterStreak };
  if (room.chapter > 0) flawless[room.chapter] = false;
  return { ...save, stats: { ...save.stats, failures: save.stats.failures + 1, flawlessChapterStreak: flawless } };
}

export function completeRoom(save: SaveData, room: Room, run: RunStats, now = new Date()): CompletionResult {
  const rewards: RewardLine[] = [];
  const rec = roomRecord(save, room.id);
  const firstClear = !rec.completed;
  let s: SaveData = save;

  // Base completion reward: paid exactly once per room.
  let base = 0;
  if (!rec.rewarded) {
    base = room.chapter > 0 && room.index === 1 ? ECONOMY.firstRoomReward : ECONOMY.roomReward;
    rewards.push({ label: 'Room escaped', amount: base, kind: 'base' });
  }

  // Coins inside the room: each pays the first time it is collected.
  let coinsFound = rec.coinsFound;
  let coinReward = 0;
  let foundHidden = false;
  room.items.forEach((it, i) => {
    if (it.kind !== 'coin' || !(run.itemsTaken & (1 << i))) return;
    if (coinsFound & (1 << i)) return;
    coinsFound |= 1 << i;
    coinReward += it.hidden ? ECONOMY.hiddenCoinValue : ECONOMY.roomCoinValue;
    if (it.hidden) foundHidden = true;
  });
  if (coinReward) rewards.push({ label: foundHidden ? 'Coins (hidden cache!)' : 'Coins collected', amount: coinReward, kind: 'coin' });

  const newRec: RoomRecord = {
    ...rec,
    completed: true,
    completions: rec.completions + 1,
    bestMoves: rec.bestMoves === undefined ? run.moves : Math.min(rec.bestMoves, run.moves),
    coinsFound,
    firstClearAt: rec.firstClearAt ?? now.toISOString(),
    rewarded: true,
    stars: (rec.stars ?? 0) | (run.stars ?? 1),
  };
  s = addCoins(
    {
      ...s,
      rooms: { ...s.rooms, [room.id]: newRec },
      stats: { ...s.stats, roomsCompleted: s.stats.roomsCompleted + 1 },
      tutorialCompleted: s.tutorialCompleted || (room.chapter === 1 && room.index >= 3),
    },
    base + coinReward,
  );

  if (run.memory) s = noteCompletionMemory(s, room, run.memory);

  let chapterCompleted: number | undefined;
  if (room.chapter > 0) {
    if (room.index >= s.highestUnlocked) s = { ...s, highestUnlocked: Math.min(CAMPAIGN_SIZE, room.index + 1) };
    if (s.lastRoom === room.index) s = { ...s, lastRoom: undefined };
    if (chapterProgress(s, room.chapter) === ROOMS_PER_CHAPTER && !s.chapterBonusClaimed.includes(room.chapter)) {
      chapterCompleted = room.chapter;
      s = addCoins({ ...s, chapterBonusClaimed: [...s.chapterBonusClaimed, room.chapter] }, ECONOMY.chapterBonus);
      rewards.push({ label: `Chapter ${room.chapter} complete`, amount: ECONOMY.chapterBonus, kind: 'chapter' });
    }
  }

  const advanced = room.chapter >= 2;
  const ach = evaluateAchievements(
    s,
    {
      no_undo: advanced && !run.usedUndo,
      efficient: advanced && run.parMoves !== undefined && run.moves <= run.parMoves,
      hidden_coin: foundHidden,
      // recordFailure marks a chapter as flawed on any failed attempt inside it.
      flawless_chapter: chapterCompleted !== undefined && s.stats.flawlessChapterStreak[chapterCompleted] !== false,
    },
    now,
  );
  s = ach.save;
  rewards.push(...ach.rewards);

  const unlocks = syncPowerUpUnlocks(s);
  s = unlocks.save;
  const powerups = [...unlocks.grants];
  if (chapterCompleted !== undefined) {
    const milestone = grantChapterPowerUps(s, chapterCompleted);
    s = milestone.save;
    powerups.push(...milestone.grants);
  }
  return {
    save: s,
    rewards,
    achievements: ach.unlocked,
    chapterCompleted,
    firstClear,
    doubleEligibleAmount: base,
    powerups,
    stars: run.stars ?? 1,
    bestStars: newRec.stars ?? 1,
  };
}

// ---- Clues and WITNESS's marks --------------------------------------------------------------

export interface ClueResult {
  save: SaveData;
  /** False if the clue was already found (nothing changes). */
  isNew: boolean;
  sigils: number;
  achievements: string[];
  rewards: RewardLine[];
}

/** Records a found clue and pays out any collection achievement it completes (once). */
export function discoverClue(save: SaveData, id: string, now = new Date()): ClueResult {
  if ((save.memory.flags[clueFlag(id)] ?? 0) > 0) return { save, isNew: false, sigils: sigilCount(memoryView(save)), achievements: [], rewards: [] };
  const marked = markClueFound(save, id);
  const ach = evaluateAchievements(marked, {}, now);
  return { save: ach.save, isNew: true, sigils: sigilCount(memoryView(ach.save)), achievements: ach.unlocked, rewards: ach.rewards };
}

// ---- Daily challenge --------------------------------------------------------------------

export type DailyClaimResult =
  | { ok: true; save: SaveData; rewards: RewardLine[]; achievements: string[] }
  | { ok: false; save: SaveData; reason: 'already_claimed' | 'not_today' | 'clock_rollback' };

/** Records the latest local day seen, to detect the device clock moving backwards. */
export function noteDay(save: SaveData, today: string): SaveData {
  const latest = save.daily.latestDaySeen;
  if (latest && daysBetween(latest, today) <= 0) return save;
  return { ...save, daily: { ...save.daily, latestDaySeen: today } };
}

export function claimDaily(save: SaveData, challengeDay: string, now = new Date()): DailyClaimResult {
  const today = dayKey(now);
  if (save.daily.claims[challengeDay]) return { ok: false, save, reason: 'already_claimed' };
  if (challengeDay !== today) return { ok: false, save, reason: 'not_today' };
  const latest = save.daily.latestDaySeen;
  if (latest && daysBetween(latest, today) < -1) return { ok: false, save, reason: 'clock_rollback' };

  const streak = save.daily.streak;
  let count = 1;
  if (streak.lastDay) {
    const gap = daysBetween(streak.lastDay, today);
    if (gap >= 1 && gap <= 1 + ECONOMY.streak.graceDays) count = streak.count + 1;
    else if (gap <= 0) count = streak.count; // should not happen (already claimed), keep streak
  }
  const streakBonus = Math.min(ECONOMY.streak.maxBonus, (count - 1) * ECONOMY.streak.bonusPerDay);
  const rewards: RewardLine[] = [{ label: 'Daily challenge', amount: ECONOMY.dailyReward, kind: 'daily' }];
  if (streakBonus > 0) rewards.push({ label: `${count}-day streak`, amount: streakBonus, kind: 'streak' });
  let s: SaveData = {
    ...save,
    daily: {
      ...save.daily,
      claims: { ...save.daily.claims, [challengeDay]: { completedAt: now.toISOString(), reward: ECONOMY.dailyReward + streakBonus } },
      streak: { count, lastDay: today, best: Math.max(streak.best, count) },
      latestDaySeen: latest && daysBetween(latest, today) < 0 ? latest : today,
    },
  };
  s = addCoins(s, ECONOMY.dailyReward + streakBonus);
  const ach = evaluateAchievements(s, {}, now);
  return { ok: true, save: ach.save, rewards: [...rewards, ...ach.rewards], achievements: ach.unlocked };
}

/**
 * Records the mastery result of a daily run. Only the day's existing claim is updated (best
 * stars and moves), so replays can improve the score but never pay coins again.
 */
export function recordDailyResult(save: SaveData, day: string, stars: number, moves: number, now = new Date()): { save: SaveData; achievements: string[]; rewards: RewardLine[] } {
  const claim = save.daily.claims[day];
  if (!claim) return { save, achievements: [], rewards: [] };
  const next = { ...claim, stars: (claim.stars ?? 0) | stars, bestMoves: claim.bestMoves === undefined ? moves : Math.min(claim.bestMoves, moves) };
  if (next.stars === claim.stars && next.bestMoves === claim.bestMoves) return { save, achievements: [], rewards: [] };
  const s = { ...save, daily: { ...save.daily, claims: { ...save.daily.claims, [day]: next } } };
  const ach = evaluateAchievements(s, {}, now);
  return { save: ach.save, achievements: ach.unlocked, rewards: ach.rewards };
}

/** Streak shown on the home screen: a streak is "alive" until the grace period lapses. */
export function liveStreak(save: SaveData, today: string): number {
  const { lastDay, count } = save.daily.streak;
  if (!lastDay) return 0;
  const gap = daysBetween(lastDay, today);
  return gap <= 1 + ECONOMY.streak.graceDays ? count : 0;
}

// ---- Shop -------------------------------------------------------------------------------

export type PurchaseResult = { ok: true; save: SaveData; achievements: string[] } | { ok: false; save: SaveData; reason: 'unknown' | 'owned' | 'insufficient' | 'not_for_sale' };

export function purchaseCosmetic(save: SaveData, id: string, now = new Date()): PurchaseResult {
  const c = getCosmetic(id);
  if (!c) return { ok: false, save, reason: 'unknown' };
  if (save.cosmetics.owned.includes(id)) return { ok: false, save, reason: 'owned' };
  if (c.achievement || c.price <= 0) return { ok: false, save, reason: 'not_for_sale' };
  if (save.coins < c.price) return { ok: false, save, reason: 'insufficient' };
  let s: SaveData = { ...save, coins: save.coins - c.price, cosmetics: { ...save.cosmetics, owned: [...save.cosmetics.owned, id] } };
  const ach = evaluateAchievements(s, {}, now);
  s = ach.save;
  return { ok: true, save: s, achievements: ach.unlocked };
}

export function selectCosmetic(save: SaveData, id: string): SaveData {
  const c = getCosmetic(id);
  if (!c || !save.cosmetics.owned.includes(id)) return save;
  return { ...save, cosmetics: { ...save.cosmetics, selected: { ...save.cosmetics.selected, [c.slot as CosmeticSlot]: id } } };
}

export function unlockBonusRoomWithCoins(save: SaveData, id: string): { ok: boolean; save: SaveData } {
  if (save.bonusRoomsUnlocked.includes(id)) return { ok: false, save };
  if (save.coins < ECONOMY.bonusRoomPrice) return { ok: false, save };
  return { ok: true, save: { ...save, coins: save.coins - ECONOMY.bonusRoomPrice, bonusRoomsUnlocked: [...save.bonusRoomsUnlocked, id] } };
}

// ---- Rewarded ad ledger -----------------------------------------------------------------

const LIMITS: Record<RewardedPlacement, number> = {
  revive: ECONOMY.ads.reviveDailyLimit,
  hint: ECONOMY.ads.hintDailyLimit,
  double_reward: ECONOMY.ads.doubleRewardDailyLimit,
  bonus_coins: ECONOMY.ads.bonusCoinsDailyLimit,
  bonus_room: ECONOMY.ads.bonusRoomUnlockDailyLimit,
  powerup: POWERUP_TUNING.adDailyLimit,
};

export function rollAdDay(save: SaveData, today: string): SaveData {
  if (save.ads.day === today) return save;
  return { ...save, ads: { ...save.ads, day: today, counts: {}, interstitialsToday: 0 } };
}

export function rewardedUsesLeft(save: SaveData, placement: RewardedPlacement, today: string): number {
  const s = rollAdDay(save, today);
  return Math.max(0, LIMITS[placement] - (s.ads.counts[placement] ?? 0));
}

export type GrantResult = { granted: true; save: SaveData } | { granted: false; save: SaveData; reason: 'duplicate' | 'limit' };

/**
 * Records a verified rewarded-ad completion. Must only be called after the SDK's
 * earned-reward callback. Idempotent per token, so duplicate callbacks grant nothing.
 * Placement-specific coin rewards are applied here; gameplay benefits are applied by the caller.
 */
export function grantRewardedAd(
  save: SaveData,
  placement: RewardedPlacement,
  token: string,
  now = new Date(),
  opts: { doubleAmount?: number; bonusRoomId?: string; powerUpId?: PowerUpId } = {},
): GrantResult {
  if (save.ads.grantedTokens.includes(token)) return { granted: false, save, reason: 'duplicate' };
  const today = dayKey(now);
  let s = rollAdDay(save, today);
  if (rewardedUsesLeft(s, placement, today) <= 0) return { granted: false, save, reason: 'limit' };
  s = {
    ...s,
    ads: {
      ...s.ads,
      counts: { ...s.ads.counts, [placement]: (s.ads.counts[placement] ?? 0) + 1 },
      grantedTokens: [...s.ads.grantedTokens, token].slice(-100),
      lastRewardedAt: now.getTime(),
    },
  };
  if (placement === 'bonus_coins') s = addCoins(s, ECONOMY.ads.bonusCoins);
  if (placement === 'double_reward' && opts.doubleAmount) s = addCoins(s, opts.doubleAmount);
  if (placement === 'bonus_room' && opts.bonusRoomId && !s.bonusRoomsUnlocked.includes(opts.bonusRoomId)) {
    s = { ...s, bonusRoomsUnlocked: [...s.bonusRoomsUnlocked, opts.bonusRoomId] };
  }
  if (placement === 'powerup' && opts.powerUpId) s = addPowerUp(s, opts.powerUpId, 1);
  return { granted: true, save: s };
}

// ---- Interstitial frequency -------------------------------------------------------------

export interface InterstitialContext {
  /** Campaign room just completed (interstitials only follow completions). */
  completedRoom: number;
  now: number;
  today: string;
  consentFlowActive: boolean;
}

export function shouldShowInterstitial(save: SaveData, ctx: InterstitialContext, policy = INTERSTITIAL_POLICY): boolean {
  if (!policy.enabled || ctx.consentFlowActive) return false;
  if (ctx.completedRoom < policy.minRoomBeforeFirst) return false;
  const s = rollAdDay(save, ctx.today);
  if (s.ads.interstitialsToday >= policy.maxPerDay) return false;
  if (s.ads.roomsSinceInterstitial < policy.roomsBetween) return false;
  if (ctx.now - s.ads.lastInterstitialAt < policy.minIntervalMs) return false;
  if (ctx.now - s.ads.lastRewardedAt < policy.cooldownAfterRewardedMs) return false;
  return true;
}

export function noteRoomForInterstitial(save: SaveData): SaveData {
  return { ...save, ads: { ...save.ads, roomsSinceInterstitial: save.ads.roomsSinceInterstitial + 1 } };
}

export function recordInterstitialShown(save: SaveData, now: number, today: string): SaveData {
  const s = rollAdDay(save, today);
  return { ...s, ads: { ...s.ads, lastInterstitialAt: now, roomsSinceInterstitial: 0, interstitialsToday: s.ads.interstitialsToday + 1 } };
}

// Pure power-up rules: unlocking, inventory, shop purchases and milestone grants.
import { CHAPTER_POWERUP_REWARDS, getPowerUp, POWERUPS, type PowerUpId } from '../config/powerups';
import { roomId } from '../game/levels';
import type { SaveData } from '../services/storage/saveSchema';

export interface PowerUpGrant {
  id: PowerUpId;
  count: number;
  reason: 'unlocked' | 'milestone' | 'ad' | 'purchase';
}

export const powerUpCount = (s: SaveData, id: PowerUpId) => s.powerups.inventory[id] ?? 0;
export const isPowerUpUnlocked = (s: SaveData, id: PowerUpId) => s.powerups.unlocked.includes(id);

export function addPowerUp(s: SaveData, id: PowerUpId, count: number): SaveData {
  return { ...s, powerups: { ...s.powerups, inventory: { ...s.powerups.inventory, [id]: powerUpCount(s, id) + count } } };
}

/** Grants each power-up whose unlock room has been escaped, once, with its starter stock. */
export function syncPowerUpUnlocks(save: SaveData): { save: SaveData; grants: PowerUpGrant[] } {
  let s = save;
  const grants: PowerUpGrant[] = [];
  for (const p of POWERUPS) {
    if (s.powerups.unlocked.includes(p.id)) continue;
    if (!s.rooms[roomId(p.unlockAfterRoom)]?.completed) continue;
    s = addPowerUp({ ...s, powerups: { ...s.powerups, unlocked: [...s.powerups.unlocked, p.id] } }, p.id, p.starterCount);
    grants.push({ id: p.id, count: p.starterCount, reason: 'unlocked' });
  }
  return { save: s, grants };
}

/** Milestone power-ups for finishing a chapter. Only unlocked power-ups are paid out. */
export function grantChapterPowerUps(save: SaveData, chapter: number): { save: SaveData; grants: PowerUpGrant[] } {
  let s = save;
  const grants: PowerUpGrant[] = [];
  for (const [id, count] of Object.entries(CHAPTER_POWERUP_REWARDS[chapter] ?? {}) as [PowerUpId, number][]) {
    if (!isPowerUpUnlocked(s, id) || !count) continue;
    s = addPowerUp(s, id, count);
    grants.push({ id, count, reason: 'milestone' });
  }
  return { save: s, grants };
}

export type BuyResult = { ok: true; save: SaveData } | { ok: false; save: SaveData; reason: 'locked' | 'coins' };

export function buyPowerUp(save: SaveData, id: PowerUpId): BuyResult {
  if (!isPowerUpUnlocked(save, id)) return { ok: false, save, reason: 'locked' };
  const price = getPowerUp(id).coinPrice;
  if (save.coins < price) return { ok: false, save, reason: 'coins' };
  return { ok: true, save: addPowerUp({ ...save, coins: save.coins - price }, id, 1) };
}

/** Takes one from the inventory. Returns null if none are left. */
export function consumePowerUp(save: SaveData, id: PowerUpId): SaveData | null {
  const n = powerUpCount(save, id);
  if (n <= 0 || !isPowerUpUnlocked(save, id)) return null;
  return {
    ...save,
    powerups: { ...save.powerups, inventory: { ...save.powerups.inventory, [id]: n - 1 }, used: save.powerups.used + 1 },
  };
}

/** Set once the player has read a power-up's explainer. */
export const powerUpTipFlag = (id: PowerUpId) => `tip.${id}`;
/** Set once a power-up's free first use is spent. */
export const freeUseFlag = (id: PowerUpId) => `free.${id}`;

export const needsPowerUpTip = (s: SaveData) => POWERUPS.find((p) => isPowerUpUnlocked(s, p.id) && !s.memory.flags[powerUpTipFlag(p.id)])?.id ?? null;

/**
 * Spends a power-up from play. The first use of each kind is the tutorial one and is free, so
 * learning a power-up never costs the stock. Returns null if none are left.
 */
export function takePowerUp(save: SaveData, id: PowerUpId): { save: SaveData; free: boolean } | null {
  if (powerUpCount(save, id) <= 0 || !isPowerUpUnlocked(save, id)) return null;
  const key = freeUseFlag(id);
  if (!save.memory.flags[key]) {
    return { free: true, save: { ...save, powerups: { ...save.powerups, used: save.powerups.used + 1 }, memory: { flags: { ...save.memory.flags, [key]: 1 } } } };
  }
  const spent = consumePowerUp(save, id);
  return spent && { save: spent, free: false };
}

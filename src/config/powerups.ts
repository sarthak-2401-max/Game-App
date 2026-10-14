// Power-ups: single-use boosts the player spends inside a room. Each one unlocks after a
// campaign room, arrives with a starter stock, and can be earned from chapter milestones,
// an optional rewarded ad, or bought with Escape Coins in the shop.
import type { IconName } from '../components/Icon';

export type PowerUpId = 'pathfinder' | 'shield' | 'overclock' | 'freeze';

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  /** One line, shown on the in-room button sheet and in the shop. */
  description: string;
  /** Unlocks once this campaign room has been escaped. */
  unlockAfterRoom: number;
  /** Granted once, the moment it unlocks. */
  starterCount: number;
  coinPrice: number;
  icon: IconName;
  color: string;
}

export const POWERUPS: readonly PowerUpDef[] = [
  {
    id: 'pathfinder',
    name: 'Pathfinder',
    description: 'Lights up the next 5 steps of a working route from where you stand.',
    unlockAfterRoom: 5,
    starterCount: 2,
    coinPrice: 60,
    icon: 'compass',
    color: '#4CF2A0',
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Absorbs the next spike, laser, drone or fall. You stay where you were.',
    unlockAfterRoom: 20,
    starterCount: 2,
    coinPrice: 80,
    icon: 'shield',
    color: '#5CC8FF',
  },
  {
    id: 'overclock',
    name: 'Overclock',
    description: 'Adds 5 moves in a move-limited room, or 20 seconds to a countdown.',
    unlockAfterRoom: 30,
    starterCount: 2,
    coinPrice: 70,
    icon: 'bolt',
    color: '#FFC24B',
  },
  {
    id: 'freeze',
    name: 'Freeze',
    description: 'Stops drones, platforms and timed traps for your next 3 actions.',
    unlockAfterRoom: 50,
    starterCount: 2,
    coinPrice: 100,
    icon: 'snow',
    color: '#B8A6FF',
  },
];

export const POWERUP_TUNING = {
  pathfinderSteps: 5,
  overclockMoves: 5,
  overclockSeconds: 20,
  freezeTurns: 3,
  /** Rewarded ads that grant a power-up, per local day. */
  adDailyLimit: 5,
} as const;

/** Extra power-ups paid out when a chapter is completed for the first time. */
export const CHAPTER_POWERUP_REWARDS: Readonly<Record<number, Partial<Record<PowerUpId, number>>>> = {
  1: { pathfinder: 1 },
  2: { pathfinder: 2 },
  3: { shield: 1 },
  4: { overclock: 1, shield: 1 },
  5: { overclock: 2 },
  6: { freeze: 1, shield: 1 },
  7: { pathfinder: 2, freeze: 1 },
  8: { shield: 2, overclock: 1 },
  9: { freeze: 2, pathfinder: 2 },
};

export const getPowerUp = (id: PowerUpId) => POWERUPS.find((p) => p.id === id)!;
export const isPowerUpId = (v: unknown): v is PowerUpId => POWERUPS.some((p) => p.id === v);

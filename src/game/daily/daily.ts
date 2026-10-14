// Deterministic daily challenge selection. Every player gets the same room on the same local
// day, without a server. Rooms are dealt in shuffled cycles so consecutive days never repeat.
import { daysBetween, hashString } from '../../utils/dates';
import type { Room } from '../types';
import { DAILY_ROOMS } from './catalog';

const EPOCH = '2026-01-01';

function permutation(cycle: number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let seed = hashString(`orl-daily-${cycle}`) || 1;
  for (let i = n - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Index into DAILY_ROOMS for a local day key (YYYY-MM-DD). */
export function dailyIndex(day: string, n = DAILY_ROOMS.length): number {
  const d = daysBetween(EPOCH, day);
  const cycle = Math.floor(d / n);
  const pos = ((d % n) + n) % n;
  const perm = permutation(cycle, n);
  if (pos === 0) {
    // Avoid repeating yesterday's room across a cycle boundary.
    const prevLast = permutation(cycle - 1, n)[n - 1];
    if (perm[0] === prevLast) return perm[1];
  }
  if (pos === 1) {
    const prevLast = permutation(cycle - 1, n)[n - 1];
    if (perm[0] === prevLast) return perm[0];
  }
  return perm[pos];
}

export function dailyRoomFor(day: string): Room {
  return DAILY_ROOMS[dailyIndex(day)];
}

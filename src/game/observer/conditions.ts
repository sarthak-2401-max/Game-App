// Conditions over room-memory flags. Data files use these to decide which WITNESS lines play,
// which clues appear and which pre-verified room variant loads. They only ever *select* content,
// so a missing or corrupted flag can change what is said, never whether a room can be solved.

import { clueFlag, SIGIL_COUNT } from './clues';

export type Condition =
  | { flag: string; gte?: number }
  | { stat: 'failures' | 'hintsUsed' | 'undos' | 'roomsCompleted'; gte: number }
  | { sigils: number }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface MemoryView {
  flags: Readonly<Record<string, number>>;
  stats: { failures: number; hintsUsed: number; undos: number; roomsCompleted: number };
}

export const flagValue = (m: MemoryView, key: string) => {
  const v = m.flags[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

// Only the real marks count, so a stray or corrupted "clue.sigil99" flag cannot open anything.
const SIGIL_FLAGS = Array.from({ length: SIGIL_COUNT }, (_, i) => clueFlag(`sigil${i + 1}`));

export const sigilCount = (m: MemoryView) => SIGIL_FLAGS.filter((k) => flagValue(m, k) > 0).length;

export function evaluate(c: Condition | undefined, m: MemoryView): boolean {
  if (!c) return true;
  if ('flag' in c) return flagValue(m, c.flag) >= (c.gte ?? 1);
  if ('stat' in c) return (m.stats[c.stat] ?? 0) >= c.gte;
  if ('sigils' in c) return sigilCount(m) >= c.sigils;
  if ('all' in c) return c.all.every((x) => evaluate(x, m));
  if ('any' in c) return c.any.some((x) => evaluate(x, m));
  return !evaluate(c.not, m);
}

/** Every flag a condition reads (used by tests to check that data only references real flags). */
export function flagsIn(c: Condition | undefined): string[] {
  if (!c) return [];
  if ('flag' in c) return [c.flag];
  if ('all' in c) return c.all.flatMap(flagsIn);
  if ('any' in c) return c.any.flatMap(flagsIn);
  if ('not' in c) return flagsIn(c.not);
  return [];
}

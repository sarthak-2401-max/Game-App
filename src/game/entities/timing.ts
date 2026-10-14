import type { Timing } from '../types';

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function isTimingActive(t: Timing, tick: number): boolean {
  return mod(tick + t.offset, t.period) < t.on;
}

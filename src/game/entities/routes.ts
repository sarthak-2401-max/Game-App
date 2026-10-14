import type { Route } from '../types';

/** Number of ticks before a route repeats. */
export function routePeriod(r: Route): number {
  const n = r.cells.length;
  if (n <= 1) return 1;
  return r.mode === 'loop' ? n : 2 * (n - 1);
}

/** Cell occupied by a drone or platform at a given tick. Pure function of the tick. */
export function routeCellAt(r: Route, tick: number): number {
  const n = r.cells.length;
  if (n <= 1) return r.cells[0];
  const p = routePeriod(r);
  const t = (((tick + r.offset) % p) + p) % p;
  if (r.mode === 'loop') return r.cells[t];
  return t < n ? r.cells[t] : r.cells[p - t];
}

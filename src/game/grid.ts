import type { Dir } from './types';

export const idx = (w: number, r: number, c: number) => r * w + c;
export const rowOf = (w: number, i: number) => Math.floor(i / w);
export const colOf = (w: number, i: number) => i % w;

export const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

/** Neighbour cell in a direction, or -1 when it would leave the grid. */
export function neighbor(w: number, h: number, i: number, d: Dir): number {
  const [dr, dc] = DELTA[d];
  const r = rowOf(w, i) + dr;
  const c = colOf(w, i) + dc;
  if (r < 0 || c < 0 || r >= h || c >= w) return -1;
  return idx(w, r, c);
}

export function dirBetween(w: number, from: number, to: number): Dir | null {
  const dr = rowOf(w, to) - rowOf(w, from);
  const dc = colOf(w, to) - colOf(w, from);
  if (dr === -1 && dc === 0) return 'up';
  if (dr === 1 && dc === 0) return 'down';
  if (dr === 0 && dc === -1) return 'left';
  if (dr === 0 && dc === 1) return 'right';
  return null;
}

// Small builders for room legends, so parameterised cells stay readable in level files.
import type { CellSpec, RouteSpec } from '../levelFormat';
import type { Dir, PathMode, Timing } from '../types';

const tm = (period: number, on: number, offset = 0): Timing => ({ period, on, offset });

export const sw = (ch: number): CellSpec => ({ tile: { k: 'switch', ch } });
export const plate = (ch: number): CellSpec => ({ tile: { k: 'plate', ch } });
export const door = (ch: number, invert = false): CellSpec => ({ tile: { k: 'door', ch, invert } });
/** A door drawn as a section of wall that slides into the floor while open. */
export const shift = (ch: number, invert = false): CellSpec => ({ tile: { k: 'door', ch, invert, look: 'wall' } });
/** Spikes driven by a channel: retracted while it is active, or raised while active if `raisedWhenOn`. */
export const chSpikes = (ch: number, raisedWhenOn = false): CellSpec => ({
  tile: { k: 'spikes', mode: { kind: 'channel', ch, raisedWhenActive: raisedWhenOn } },
});
export const timedSpikes = (period: number, on: number, offset = 0): CellSpec => ({
  tile: { k: 'spikes', mode: { kind: 'timed', timing: tm(period, on, offset) } },
});
export const laser = (dir: Dir, opts: { ch?: number; invert?: boolean; timing?: [number, number, number?] } = {}): CellSpec => ({
  tile: {
    k: 'emitter',
    dir,
    ch: opts.ch,
    invert: opts.invert,
    timing: opts.timing ? tm(opts.timing[0], opts.timing[1], opts.timing[2] ?? 0) : undefined,
  },
});
const route = (path: string, mode: PathMode, offset: number): RouteSpec => ({ path, mode, offset });
export const drone = (path: string, mode: PathMode = 'pingpong', offset = 0): CellSpec => ({
  tile: { k: 'floor' },
  drone: route(path, mode, offset),
});
export const platform = (path: string, mode: PathMode = 'pingpong', offset = 0): CellSpec => ({
  tile: { k: 'pit' },
  platform: route(path, mode, offset),
});
export const tele = (pair: number): CellSpec => ({ tile: { k: 'tele', pair } });
export const coinOn = (hidden = false): CellSpec => ({ tile: { k: 'floor' }, item: { kind: 'coin', hidden } });

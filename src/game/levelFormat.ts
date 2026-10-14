// Human-authorable room format. Rooms are written as ASCII maps plus an optional legend for
// parameterised cells (extra channels, timed traps, drones, platforms).
//
// Default legend:
//   #  wall              .  floor             P  player start      E  exit
//   ^  spikes (always)   !  spikes, up on even turns   i  spikes, up on odd turns
//   ~  pit / chasm       %  crumbling floor   B  pushable block    C  checkpoint
//   *  energy core (required before the exit opens)    $  coin    ?  hidden coin
//   k  gold key          L  gold lock         j  blue key          J  blue lock
//   s  switch (ch 0)     _  pressure plate (ch 0)
//   d  door (ch 0, opens while active)        x  door (ch 0, closes while active)
//   w  spikes (ch 0, retract while active)    T / U  teleporter pairs 0 / 1
//   > < v A  laser emitters facing right / left / down / up
// Any other character must be defined in the room's legend.

import { DELTA, idx } from './grid';
import type { Dir, Item, KeyColor, PathMode, Room, Route, Tile } from './types';

export interface RouteSpec {
  /** Moves from the starting cell, e.g. "RRRR" or "RRDDLLUU". */
  path: string;
  mode?: PathMode;
  offset?: number;
}

export interface CellSpec {
  tile?: Tile;
  item?: { kind: Item['kind']; color?: KeyColor; hidden?: boolean };
  block?: boolean;
  player?: boolean;
  drone?: RouteSpec;
  platform?: RouteSpec;
}

export interface LevelSpec {
  name: string;
  map: string[];
  legend?: Record<string, CellSpec>;
  moveLimit?: number;
  timeLimit?: number;
  intro?: string;
  hint?: string;
}

const T = (t: Tile): CellSpec => ({ tile: t });

export const DEFAULT_LEGEND: Record<string, CellSpec> = {
  '#': T({ k: 'wall' }),
  '.': T({ k: 'floor' }),
  P: { tile: { k: 'floor' }, player: true },
  E: T({ k: 'exit' }),
  '^': T({ k: 'spikes', mode: { kind: 'static' } }),
  '!': T({ k: 'spikes', mode: { kind: 'timed', timing: { period: 2, on: 1, offset: 0 } } }),
  i: T({ k: 'spikes', mode: { kind: 'timed', timing: { period: 2, on: 1, offset: 1 } } }),
  '~': T({ k: 'pit' }),
  '%': T({ k: 'crumble' }),
  B: { tile: { k: 'floor' }, block: true },
  C: T({ k: 'checkpoint' }),
  '*': { tile: { k: 'floor' }, item: { kind: 'core' } },
  $: { tile: { k: 'floor' }, item: { kind: 'coin' } },
  '?': { tile: { k: 'floor' }, item: { kind: 'coin', hidden: true } },
  k: { tile: { k: 'floor' }, item: { kind: 'key', color: 'gold' } },
  L: T({ k: 'lock', color: 'gold' }),
  j: { tile: { k: 'floor' }, item: { kind: 'key', color: 'blue' } },
  J: T({ k: 'lock', color: 'blue' }),
  s: T({ k: 'switch', ch: 0 }),
  _: T({ k: 'plate', ch: 0 }),
  d: T({ k: 'door', ch: 0 }),
  x: T({ k: 'door', ch: 0, invert: true }),
  w: T({ k: 'spikes', mode: { kind: 'channel', ch: 0 } }),
  T: T({ k: 'tele', pair: 0 }),
  U: T({ k: 'tele', pair: 1 }),
  '>': T({ k: 'emitter', dir: 'right' }),
  '<': T({ k: 'emitter', dir: 'left' }),
  v: T({ k: 'emitter', dir: 'down' }),
  A: T({ k: 'emitter', dir: 'up' }),
};

const MOVE: Record<string, Dir> = { U: 'up', D: 'down', L: 'left', R: 'right' };

export class LevelFormatError extends Error {}

function buildRoute(w: number, h: number, start: number, spec: RouteSpec, where: string): Route {
  const cells = [start];
  let r = Math.floor(start / w);
  let c = start % w;
  for (const ch of spec.path) {
    const d = MOVE[ch];
    if (!d) throw new LevelFormatError(`${where}: bad route step "${ch}"`);
    r += DELTA[d][0];
    c += DELTA[d][1];
    if (r < 0 || c < 0 || r >= h || c >= w) throw new LevelFormatError(`${where}: route leaves grid`);
    cells.push(idx(w, r, c));
  }
  const mode = spec.mode ?? 'pingpong';
  if (mode === 'loop') {
    if (cells.length > 1 && cells[cells.length - 1] !== start) {
      throw new LevelFormatError(`${where}: loop route must return to its start`);
    }
    if (cells.length > 1) cells.pop();
  }
  return { cells, mode, offset: spec.offset ?? 0 };
}

export function parseLevel(spec: LevelSpec, id: string, chapter: number, index: number): Room {
  const height = spec.map.length;
  const width = Math.max(...spec.map.map((r) => r.length));
  if (spec.map.some((r) => r.length !== width)) {
    throw new LevelFormatError(`${id}: all map rows must have the same width`);
  }
  const legend = { ...DEFAULT_LEGEND, ...(spec.legend ?? {}) };
  const tiles: Tile[] = [];
  const blocks: number[] = [];
  const items: Item[] = [];
  const drones: Route[] = [];
  const platforms: Route[] = [];
  let start = -1;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const ch = spec.map[r][c];
      const cell = legend[ch];
      if (!cell) throw new LevelFormatError(`${id}: unknown map character "${ch}" at ${r},${c}`);
      const i = idx(width, r, c);
      tiles.push(cell.tile ?? { k: 'floor' });
      if (cell.player) {
        if (start !== -1) throw new LevelFormatError(`${id}: more than one player start`);
        start = i;
      }
      if (cell.block) blocks.push(i);
      if (cell.item) items.push({ ...cell.item, cell: i });
      if (cell.drone) drones.push(buildRoute(width, height, i, cell.drone, `${id} drone@${r},${c}`));
      if (cell.platform) platforms.push(buildRoute(width, height, i, cell.platform, `${id} platform@${r},${c}`));
    }
  }
  if (start === -1) throw new LevelFormatError(`${id}: no player start`);

  return {
    id,
    chapter,
    index,
    name: spec.name,
    width,
    height,
    tiles,
    start,
    blocks,
    items,
    drones,
    platforms,
    moveLimit: spec.moveLimit,
    timeLimit: spec.timeLimit,
    intro: spec.intro,
    hint: spec.hint,
    tags: deriveTags(tiles, items, blocks, drones, platforms, spec),
  };
}

export function deriveTags(
  tiles: Tile[],
  items: Item[],
  blocks: number[],
  drones: Route[],
  platforms: Route[],
  spec: Pick<LevelSpec, 'moveLimit' | 'timeLimit'>,
): string[] {
  const tags = new Set<string>();
  for (const t of tiles) {
    if (t.k === 'spikes') tags.add(t.mode.kind === 'static' ? 'spikes' : t.mode.kind === 'timed' ? 'timedSpikes' : 'switchSpikes');
    else if (t.k === 'emitter') tags.add(t.timing ? 'timedLaser' : t.ch !== undefined ? 'switchLaser' : 'laser');
    else if (!['floor', 'wall', 'exit'].includes(t.k)) tags.add(t.k);
  }
  for (const it of items) tags.add(it.kind === 'coin' && it.hidden ? 'hiddenCoin' : it.kind);
  if (blocks.length) tags.add('block');
  if (drones.length) tags.add('drone');
  if (platforms.length) tags.add('platform');
  if (spec.moveLimit !== undefined) tags.add('moveLimit');
  if (spec.timeLimit !== undefined) tags.add('timer');
  return [...tags].sort();
}

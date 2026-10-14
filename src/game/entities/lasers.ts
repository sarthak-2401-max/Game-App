import { neighbor } from '../grid';
import type { Dir, GameState, Room } from '../types';
import { activeChannels, isChannelOn } from './channels';
import { emitterActive } from './hazards';
import { effectiveTile } from './terrain';

/** Whether a door/lock/wall at `cell` currently stops movement and beams. */
export function isDoorClosed(room: Room, s: GameState, cell: number, channels: number): boolean {
  const t = effectiveTile(room, s, cell);
  if (t.k !== 'door') return false;
  // A door cannot close on something standing in it.
  if (s.player === cell || s.blocks.includes(cell)) return false;
  const on = isChannelOn(channels, t.ch);
  return t.invert ? on : !on;
}

/** Beams stop at walls, emitters, closed doors, locks and blocks. */
function stopsBeam(room: Room, s: GameState, cell: number, channels: number): boolean {
  const t = effectiveTile(room, s, cell);
  if (t.k === 'wall' || t.k === 'emitter' || t.k === 'lock') return true;
  if (t.k === 'door' && isDoorClosed(room, s, cell, channels)) return true;
  return s.blocks.includes(cell);
}

/** All cells currently covered by laser beams (not including emitters). */
export function laserCells(room: Room, s: GameState, channels = activeChannels(room, s)): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < room.tiles.length; i++) {
    const t = room.tiles[i];
    if (t.k !== 'emitter' || !emitterActive(t, s.tick, channels)) continue;
    let c = neighbor(room.width, room.height, i, t.dir);
    while (c !== -1 && !stopsBeam(room, s, c, channels)) {
      out.add(c);
      c = neighbor(room.width, room.height, c, t.dir);
    }
  }
  return out;
}

export interface BeamSegment {
  emitter: number;
  dir: Dir;
  cells: number[];
}

/** Beam segments per active emitter, for rendering. */
export function laserBeams(room: Room, s: GameState, channels = activeChannels(room, s)): BeamSegment[] {
  const out: BeamSegment[] = [];
  for (let i = 0; i < room.tiles.length; i++) {
    const t = room.tiles[i];
    if (t.k !== 'emitter' || !emitterActive(t, s.tick, channels)) continue;
    const cells: number[] = [];
    let c = neighbor(room.width, room.height, i, t.dir);
    while (c !== -1 && !stopsBeam(room, s, c, channels)) {
      cells.push(c);
      c = neighbor(room.width, room.height, c, t.dir);
    }
    out.push({ emitter: i, dir: t.dir, cells });
  }
  return out;
}

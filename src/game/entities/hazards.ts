import type { Room, Tile } from '../types';
import { isChannelOn } from './channels';
import { routeCellAt } from './routes';
import { isTimingActive } from './timing';

export function spikesRaised(tile: Tile, tick: number, channels: number): boolean {
  if (tile.k !== 'spikes') return false;
  const m = tile.mode;
  if (m.kind === 'static') return true;
  if (m.kind === 'timed') return isTimingActive(m.timing, tick);
  const on = isChannelOn(channels, m.ch);
  return m.raisedWhenActive ? on : !on;
}

export function emitterActive(tile: Tile, tick: number, channels: number): boolean {
  if (tile.k !== 'emitter') return false;
  if (tile.ch !== undefined && isChannelOn(channels, tile.ch) !== !!tile.invert) return false;
  if (tile.timing && !isTimingActive(tile.timing, tick)) return false;
  return true;
}

export const droneCells = (room: Room, tick: number) => room.drones.map((d) => routeCellAt(d, tick));
export const platformCells = (room: Room, tick: number) =>
  room.platforms.map((p) => routeCellAt(p, tick));

export function hasPlatformAt(room: Room, tick: number, cell: number): boolean {
  for (const p of room.platforms) if (routeCellAt(p, tick) === cell) return true;
  return false;
}


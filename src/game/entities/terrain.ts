import type { GameState, Room, Tile } from '../types';

const PIT: Tile = { k: 'pit' };
const FLOOR: Tile = { k: 'floor' };

/** The tile at a cell after in-room changes (crumbled floors, filled pits, opened locks). */
export function effectiveTile(room: Room, s: GameState, i: number): Tile {
  const m = s.mods[i];
  if (m === 'pit') return PIT;
  if (m === 'floor') return FLOOR;
  return room.tiles[i];
}

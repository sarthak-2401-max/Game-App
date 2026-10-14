import type { GameState, Room } from '../types';
import { effectiveTile } from './terrain';

/**
 * A channel is active when its switch has been toggled on, or when any pressure plate on
 * that channel is held down by the player or a block.
 */
export function activeChannels(room: Room, s: GameState): number {
  let mask = s.switches;
  const pressed = (cell: number) => s.player === cell || s.blocks.includes(cell);
  for (let i = 0; i < room.tiles.length; i++) {
    const t = effectiveTile(room, s, i);
    if (t.k === 'plate' && pressed(i)) mask |= 1 << t.ch;
  }
  return mask;
}

export const isChannelOn = (mask: number, ch: number) => (mask & (1 << ch)) !== 0;

// Pure WITNESS logic: which room variant loads, which lines play for a trigger, and which clues
// the player has just found. The UI calls these; tests drive them directly.
import { colOf, rowOf } from '../grid';
import type { GameState, Room } from '../types';
import { cluesInRoom, clueFlag, type Clue } from './clues';
import { evaluate, flagValue, sigilCount, type MemoryView } from './conditions';
import { ROOM_VARIANTS, variantRoom } from './rooms';
import { seenFlag, TRANSMISSIONS, type Transmission, type Trigger } from './script';

/** The campaign room as this player should see it: the first variant whose condition holds. */
export function resolveRoom(base: Room, mem: MemoryView): Room {
  for (const v of ROOM_VARIANTS) {
    if (v.room === base.id && evaluate(v.when, mem)) return variantRoom(base, v);
  }
  return base;
}

/** Cells that slide open when a variant loads (for the reveal animation). */
export function openedCells(room: Room): number[] {
  if (!room.variant) return [];
  const v = ROOM_VARIANTS.find((x) => x.room === room.id && x.id === room.variant);
  return v ? v.opened.map(([r, c]) => r * room.width + c) : [];
}

function sameTrigger(a: Trigger, b: Trigger): boolean {
  if (a.on !== b.on) return false;
  switch (a.on) {
    case 'move':
      return a.n === (b as typeof a).n;
    case 'pickup':
      return a.kind === (b as typeof a).kind;
    case 'cell':
      return a.at[0] === (b as typeof a).at[0] && a.at[1] === (b as typeof a).at[1];
    case 'clue':
      return a.id === (b as typeof a).id;
    case 'sigil':
      return a.count === (b as typeof a).count;
    case 'fail':
      return (b as typeof a).deaths >= a.deaths;
    default:
      return true;
  }
}

/** Lines that should play for this trigger in this room, in script order. */
export function transmissionsFor(roomId: string, trigger: Trigger, mem: MemoryView): Transmission[] {
  return TRANSMISSIONS.filter(
    (t) =>
      (t.room === roomId || t.room === '*') &&
      sameTrigger(t.trigger, trigger) &&
      evaluate(t.when, mem) &&
      !(t.once !== false && flagValue(mem, seenFlag(t.id)) > 0),
  );
}

export interface TemplateVars {
  moves?: number;
  deaths?: number;
}

/** Fills {placeholders} from the run and the save. Unknown names are left out, never shown raw. */
export function fillTemplate(text: string, mem: MemoryView, run: TemplateVars = {}): string {
  const cleanRooms = Object.keys(mem.flags).filter((k) => k.endsWith('.clean') && flagValue(mem, k) > 0).length;
  // Archive views have no run: those numbers read as an ellipsis rather than a wrong zero.
  const vars: Record<string, number | string> = {
    moves: run.moves ?? '…',
    deaths: run.deaths ?? '…',
    totalDeaths: mem.stats.failures,
    totalHints: mem.stats.hintsUsed,
    rooms: mem.stats.roomsCompleted,
    cleanRooms,
    sigils: sigilCount(mem),
  };
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : ''));
}

/** Clues present in this room for this player (variant- and condition-aware). */
export function roomClues(room: Room, mem: MemoryView): Clue[] {
  return cluesInRoom(room.id, room.variant).filter((c) => evaluate(c.when, mem));
}

export const clueCell = (room: Room, c: Clue) => c.at[0] * room.width + c.at[1];

/** Is the clue readable from where the player stands? Walls are read from an adjacent floor. */
export function clueInReach(room: Room, c: Clue, player: number): boolean {
  const cell = clueCell(room, c);
  if (c.kind !== 'wall') return player === cell;
  const dr = Math.abs(rowOf(room.width, cell) - rowOf(room.width, player));
  const dc = Math.abs(colOf(room.width, cell) - colOf(room.width, player));
  return dr + dc === 1;
}

/** Clues found by standing where the player is now. Dark clues need the lights to be out. */
export function cluesFound(room: Room, clues: readonly Clue[], state: GameState, mem: MemoryView, dark: boolean): Clue[] {
  if (state.status === 'dead') return [];
  return clues.filter(
    (c) => flagValue(mem, clueFlag(c.id)) === 0 && (c.reveal !== 'dark' || dark) && clueInReach(room, c, state.player),
  );
}

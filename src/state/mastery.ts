// Mastery stars. Every room offers three:
//   1. Escape.
//   2. Escape within a move target (the shortest solution plus some slack).
//   3. A room objective: the hidden cache, every coin, WITNESS's mark, or (in rooms with none
//      of those) escaping without undo.
// Hints, power-ups and revives never cost a star. Stars are kept as a union across runs, so a
// player can earn them one at a time.
import { CAMPAIGN } from '../game/levels';
import SOLUTIONS from '../game/levels/solutions.generated.json';
import { solutionKey } from '../game/echo';
import { cluesInRoom, clueFlag } from '../game/observer/clues';
import { INTERLUDES } from '../game/observer/rooms';
import type { Room } from '../game/types';
import type { SaveData } from '../services/storage/saveSchema';

export const STAR_ESCAPE = 1;
export const STAR_MOVES = 2;
export const STAR_OBJECTIVE = 4;

export type Objective = 'hidden' | 'coins' | 'sigil' | 'noUndo';

export interface StarCriteria {
  movesTarget: number;
  objective: Objective;
  objectiveLabel: string;
}

const OBJECTIVE_LABEL: Record<Objective, string> = {
  hidden: 'Find the hidden cache',
  coins: 'Collect every coin',
  sigil: "Find WITNESS's mark",
  noUndo: 'Escape without using undo',
};

export const parFor = (room: Room): number | undefined => (SOLUTIONS as Record<string, string>)[solutionKey(room)]?.length;

export function movesTarget(room: Room, par: number | undefined): number {
  if (par === undefined) return room.moveLimit ?? 999;
  if (room.moveLimit !== undefined) return Math.min(room.moveLimit, par + Math.max(1, Math.floor((room.moveLimit - par) / 2)));
  return par + Math.max(2, Math.ceil(par * 0.2));
}

export function starCriteria(room: Room, par = parFor(room)): StarCriteria {
  let objective: Objective = 'noUndo';
  if (room.items.some((i) => i.kind === 'coin' && i.hidden)) objective = 'hidden';
  else if (room.items.some((i) => i.kind === 'coin')) objective = 'coins';
  else if (cluesInRoom(room.id, room.variant).some((c) => c.kind === 'sigil')) objective = 'sigil';
  return { movesTarget: movesTarget(room, par), objective, objectiveLabel: OBJECTIVE_LABEL[objective] };
}

export interface MasteryRun {
  moves: number;
  usedUndo: boolean;
  /** Coins collected this run (bitmask over room.items). */
  itemsTaken: number;
}

/** Stars earned by a winning run. `save` supplies coins and marks found on earlier runs. */
export function starsForWin(room: Room, run: MasteryRun, save: SaveData, crit = starCriteria(room)): number {
  let s = STAR_ESCAPE;
  if (run.moves <= crit.movesTarget) s |= STAR_MOVES;
  const everCoins = (save.rooms[room.id]?.coinsFound ?? 0) | run.itemsTaken;
  const coinIdx = room.items.map((it, i) => (it.kind === 'coin' ? i : -1)).filter((i) => i >= 0);
  const done =
    crit.objective === 'hidden'
      ? room.items.every((it, i) => !(it.kind === 'coin' && it.hidden) || (everCoins & (1 << i)) !== 0)
      : crit.objective === 'coins'
        ? coinIdx.every((i) => (everCoins & (1 << i)) !== 0)
        : crit.objective === 'sigil'
          ? cluesInRoom(room.id, room.variant).filter((c) => c.kind === 'sigil').every((c) => (save.memory.flags[clueFlag(c.id)] ?? 0) > 0)
          : !run.usedUndo;
  if (done) s |= STAR_OBJECTIVE;
  return s;
}

export const starCount = (mask: number | undefined) => ((mask ?? 0) & 1) + (((mask ?? 0) >> 1) & 1) + (((mask ?? 0) >> 2) & 1);

const STAR_ROOMS = [...CAMPAIGN.map((r) => r.id), ...INTERLUDES.map((i) => i.id)];

/** Stars across the campaign and the Observation Wing. */
export const totalStars = (save: SaveData) => STAR_ROOMS.reduce((n, id) => n + starCount(save.rooms[id]?.stars), 0);
export const MAX_STARS = STAR_ROOMS.length * 3;

/**
 * Gives saves from before stars existed the stars they provably earned: escape, the move target
 * from their best run, and coin objectives from coins already found. Runs once (idempotent).
 */
export function backfillStars(save: SaveData): SaveData {
  if (save.memory.flags['sys.starsBackfilled']) return save;
  const rooms = { ...save.rooms };
  for (const room of CAMPAIGN) {
    const rec = rooms[room.id];
    if (!rec?.completed || rec.stars !== undefined) continue;
    const crit = starCriteria(room);
    let s = STAR_ESCAPE;
    if (rec.bestMoves !== undefined && rec.bestMoves <= crit.movesTarget) s |= STAR_MOVES;
    if (crit.objective === 'hidden' || crit.objective === 'coins') {
      if (starsForWin(room, { moves: Infinity, usedUndo: true, itemsTaken: 0 }, save, crit) & STAR_OBJECTIVE) s |= STAR_OBJECTIVE;
    }
    rooms[room.id] = { ...rec, stars: s };
  }
  return { ...save, rooms, memory: { flags: { ...save.memory.flags, 'sys.starsBackfilled': 1 } } };
}

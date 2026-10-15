// Room memory writers. Pure functions over the save; the session and screens call them as
// things happen. Flags are counters (0 = never). See saveSchema `memory` for the key format.
import SOLUTIONS from '../game/levels/solutions.generated.json';
import { solutionKey } from '../game/echo';
import { neighbor } from '../game/grid';
import { clueFlag } from '../game/observer/clues';
import type { MemoryView } from '../game/observer/conditions';
import { ROOM_ROUTES } from '../game/observer/rooms';
import { seenFlag } from '../game/observer/script';
import { decodeSolution } from '../game/solver/solver';
import type { Room } from '../game/types';
import type { SaveData } from '../services/storage/saveSchema';

export const memoryView = (s: SaveData): MemoryView => ({
  flags: s.memory.flags,
  stats: { failures: s.stats.failures, hintsUsed: s.stats.hintsUsed, undos: s.stats.undos, roomsCompleted: s.stats.roomsCompleted },
});

export function addFlag(s: SaveData, key: string, n = 1): SaveData {
  const flags = { ...s.memory.flags, [key]: (s.memory.flags[key] ?? 0) + n };
  return { ...s, memory: { flags } };
}

export function setFlag(s: SaveData, key: string, value = 1): SaveData {
  if ((s.memory.flags[key] ?? 0) >= value) return s;
  return { ...s, memory: { flags: { ...s.memory.flags, [key]: value } } };
}

export const hasFlag = (s: SaveData, key: string) => (s.memory.flags[key] ?? 0) > 0;

export const noteDeathMemory = (s: SaveData, room: Room) => addFlag(s, `${room.id}.deaths`);
export const noteHintMemory = (s: SaveData, room: Room) => addFlag(s, `${room.id}.hint`);
export const noteReviveMemory = (s: SaveData, room: Room) => addFlag(addFlag(s, `${room.id}.revive`), 'all.revive');
export const markClueFound = (s: SaveData, id: string) => setFlag(s, clueFlag(id));
export const markHeard = (s: SaveData, id: string) => setFlag(s, seenFlag(id));

export interface MemoryRun {
  usedUndo: boolean;
  /** Cells the player stood on during the winning attempt. */
  visited: readonly number[];
}

/** Cells walked by the stored shortest solution (to recognise alternative routes). */
function solutionCells(room: Room): Set<number> {
  const out = new Set<number>([room.start]);
  const code = (SOLUTIONS as Record<string, string>)[solutionKey(room)];
  if (!code) return out;
  let c = room.start;
  for (const a of decodeSolution(code)) {
    if (a !== 'wait') {
      const n = neighbor(room.width, room.height, c, a);
      if (n !== -1) c = n;
    }
    out.add(c);
  }
  return out;
}

/**
 * Records what a completed room says about the player: done, finished without undo, which
 * declared route they took (only the first completion decides a route), and whether they found
 * a route clearly different from the shortest one.
 */
export function noteCompletionMemory(s: SaveData, room: Room, run: MemoryRun): SaveData {
  const id = room.id;
  const first = !hasFlag(s, `${id}.done`);
  let out = addFlag(s, `${id}.done`);
  if (!run.usedUndo) out = setFlag(out, `${id}.clean`);
  const routes = ROOM_ROUTES[id];
  if (routes && first) {
    for (const [name, cells] of Object.entries(routes)) {
      if (cells.some(([r, c]) => run.visited.includes(r * room.width + c))) out = setFlag(out, `${id}.route.${name}`);
    }
  }
  const sol = solutionCells(room);
  const different = new Set(run.visited.filter((c) => !sol.has(c))).size;
  if (different >= 3) out = setFlag(out, `${id}.alt`);
  return out;
}

// Breadth-first solver that drives the real engine (`step`), so it models the exact game
// rules. BFS returns a shortest solution in turns. Time-dependent elements (drones,
// platforms, timed traps) are periodic, so the tick is hashed modulo the room's period.

import { initialState, step, stateKey, type EngineOptions } from '../engine';
import { routePeriod } from '../entities/routes';
import { ACTIONS, type Action, type GameState, type Room } from '../types';

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** Number of turns after which every time-dependent element in the room repeats. */
export function roomPeriod(room: Room): number {
  let p = 1;
  for (const r of [...room.drones, ...room.platforms]) p = lcm(p, routePeriod(r));
  for (const t of room.tiles) {
    if (t.k === 'spikes' && t.mode.kind === 'timed') p = lcm(p, t.mode.timing.period);
    if (t.k === 'emitter' && t.timing) p = lcm(p, t.timing.period);
  }
  return p;
}

const isTimeless = (room: Room) => roomPeriod(room) === 1;

export interface SolveResult {
  solvable: boolean;
  solution: Action[];
  explored: number;
  /** True when the search stopped at maxNodes before finishing. */
  truncated: boolean;
}

export interface SolveOptions extends EngineOptions {
  maxNodes?: number;
  from?: GameState;
}

export function solve(room: Room, opts: SolveOptions = {}): SolveResult {
  const maxNodes = opts.maxNodes ?? 2_000_000;
  const period = roomPeriod(room);
  // Waiting changes nothing in a room with no clock, so skip it there.
  const actions = isTimeless(room) ? ACTIONS.filter((a) => a !== 'wait') : ACTIONS;
  const start = opts.from ?? initialState(room);
  if (start.status === 'won') return { solvable: true, solution: [], explored: 1, truncated: false };

  const states: GameState[] = [start];
  const parent: number[] = [-1];
  const via: Action[] = ['wait'];
  const seen = new Set<string>([stateKey(start, period)]);

  for (let head = 0; head < states.length; head++) {
    if (states.length > maxNodes) return { solvable: false, solution: [], explored: states.length, truncated: true };
    const s = states[head];
    for (const a of actions) {
      const r = step(room, s, a, opts);
      if (!r.valid || r.state.status === 'dead') continue;
      const k = stateKey(r.state, period);
      if (seen.has(k)) continue;
      seen.add(k);
      states.push(r.state);
      parent.push(head);
      via.push(a);
      if (r.state.status === 'won') {
        const path: Action[] = [];
        for (let n = states.length - 1; n > 0; n = parent[n]) path.push(via[n]);
        return { solvable: true, solution: path.reverse(), explored: states.length, truncated: false };
      }
    }
  }
  return { solvable: false, solution: [], explored: states.length, truncated: false };
}

export interface RoomAnalysis {
  reachable: number;
  /** Playing states from which the room can no longer be won. */
  deadEnds: number;
  /** Turns on a shortest solution where at least one valid action loses (death or dead end). */
  criticalChoices: number;
  truncated: boolean;
}

/**
 * Explores the full state graph to measure how much the room punishes careless play.
 * Used by the level report to reject "corridor" rooms that have no meaningful decisions.
 */
export function analyze(room: Room, solution: Action[], maxNodes = 300_000): RoomAnalysis {
  const period = roomPeriod(room);
  const withMoves = room.moveLimit !== undefined;
  const key = (s: GameState) => stateKey(s, period) + (withMoves ? `#${s.moves}` : '');
  const actions = isTimeless(room) ? ACTIONS.filter((a) => a !== 'wait') : ACTIONS;
  const start = initialState(room);
  const ids = new Map<string, number>([[key(start), 0]]);
  const states: GameState[] = [start];
  const rev: number[][] = [[]];
  const won: number[] = [];
  let truncated = false;

  for (let head = 0; head < states.length; head++) {
    if (states.length > maxNodes) {
      truncated = true;
      break;
    }
    const s = states[head];
    if (s.status !== 'playing') continue;
    for (const a of actions) {
      const r = step(room, s, a);
      if (!r.valid || r.state.status === 'dead') continue;
      const k = key(r.state);
      let id = ids.get(k);
      if (id === undefined) {
        id = states.length;
        ids.set(k, id);
        states.push(r.state);
        rev.push([]);
        if (r.state.status === 'won') won.push(id);
      }
      rev[id].push(head);
    }
  }

  const good = new Uint8Array(states.length);
  const queue = [...won];
  for (const w of won) good[w] = 1;
  while (queue.length) {
    const n = queue.pop()!;
    for (const p of rev[n]) if (!good[p]) {
      good[p] = 1;
      queue.push(p);
    }
  }
  let deadEnds = 0;
  states.forEach((s, i) => {
    if (s.status === 'playing' && !good[i]) deadEnds++;
  });

  let criticalChoices = 0;
  let s = start;
  for (const move of solution) {
    let losing = false;
    for (const a of actions) {
      const r = step(room, s, a);
      if (!r.valid) continue;
      if (r.state.status === 'dead') losing = true;
      else {
        const id = ids.get(key(r.state));
        if (id !== undefined && !good[id]) losing = true;
      }
    }
    if (losing) criticalChoices++;
    s = step(room, s, move).state;
  }
  return { reachable: states.length, deadEnds, criticalChoices, truncated };
}

export const ACTION_CODES: Record<Action, string> = { up: 'U', down: 'D', left: 'L', right: 'R', wait: 'W' };
const FROM_CODE: Record<string, Action> = { U: 'up', D: 'down', L: 'left', R: 'right', W: 'wait' };
export const encodeSolution = (a: Action[]) => a.map((x) => ACTION_CODES[x]).join('');
export const decodeSolution = (s: string): Action[] => [...s].map((c) => FROM_CODE[c]);

// Hint generation for the "extra hint" placement. Uses the precomputed shortest solution when
// the player is still on it, otherwise searches from the current state with a node budget.
import { initialState, step, stateKey } from './engine';
import { decodeSolution, roomPeriod, solve } from './solver/solver';
import type { Action, GameState, Room } from './types';

export type HintResult =
  | { kind: 'moves'; moves: Action[]; total: number }
  | { kind: 'stuck' } // provably no way to win from here
  | { kind: 'unknown' }; // search budget exceeded

export function nextMovesHint(room: Room, state: GameState, stored: string | undefined, count = 3, maxNodes = 40_000): HintResult {
  if (state.status !== 'playing') return { kind: 'unknown' };
  const period = roomPeriod(room);
  const key = stateKey(state, period);
  if (stored) {
    const sol = decodeSolution(stored);
    let s = initialState(room);
    for (let i = 0; i <= sol.length; i++) {
      if (stateKey(s, period) === key && s.moves === state.moves) {
        const rest = sol.slice(i);
        return { kind: 'moves', moves: rest.slice(0, count), total: rest.length };
      }
      if (i < sol.length) s = step(room, s, sol[i]).state;
    }
  }
  // Searching ignores the move limit's extra moves; the engine applies the real limit.
  const res = solve(room, { from: state, maxNodes });
  if (res.solvable) return { kind: 'moves', moves: res.solution.slice(0, count), total: res.solution.length };
  return res.truncated ? { kind: 'unknown' } : { kind: 'stuck' };
}

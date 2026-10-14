// Full solvability check: runs the BFS solver against every campaign, daily and bonus room.
// This is the same check as `npm run levels:report`, minus the dead-end analysis.
import { BONUS_ROOMS, DAILY_ROOMS } from '../src/game/daily/catalog';
import { replay } from '../src/game/engine';
import { CAMPAIGN } from '../src/game/levels';
import { solve } from '../src/game/solver/solver';
import { validateSolvable } from '../src/game/validator';
import { room } from './helpers';

describe('solver', () => {
  test('finds the shortest path and proves unsolvable rooms', () => {
    const open = room(['######', '#P...#', '#...E#', '######']);
    const r = solve(open);
    expect(r.solvable).toBe(true);
    expect(r.solution).toHaveLength(4);
    expect(replay(open, r.solution).status).toBe('won');
    const sealed = room(['######', '#P#.E#', '######']);
    const no = solve(sealed);
    expect(no.solvable).toBe(false);
    expect(no.truncated).toBe(false);
  });
});

describe('every room is solvable under the real rules', () => {
  test.each([...CAMPAIGN, ...DAILY_ROOMS, ...BONUS_ROOMS].map((r) => [r.id, r.name, r] as const))('%s %s', (_id, _n, r) => {
    const rep = validateSolvable(r);
    expect(rep.issues).toEqual([]);
    expect(rep.result.solvable).toBe(true);
  });
});

import { ECONOMY } from '../src/config/economy';
import { nextMovesHint } from '../src/game/hints';
import { initialState, step } from '../src/game/engine';
import { getRoom } from '../src/game/levels';
import SOLUTIONS from '../src/game/levels/solutions.generated.json';
import { act, applyRevive, newSession, restart, restoreCheckpoint, reviveOffer, tickTimer, undo } from '../src/state/session';
import { room } from './helpers';

describe('session', () => {
  test('undo restores the previous state and is recorded', () => {
    const r = room(['######', '#P..E#', '######']);
    let s = act(newSession(r, 'campaign'), 'right');
    expect(s.state.player).toBe(r.start + 1);
    s = undo(s);
    expect(s.state.player).toBe(r.start);
    expect(s.usedUndo).toBe(true);
  });

  test('restart counts attempts and keeps undo usage', () => {
    const r = room(['######', '#P..E#', '######']);
    const s = restart(undo(act(newSession(r, 'campaign'), 'right')));
    expect(s.attempt).toBe(2);
    expect(s.usedUndo).toBe(true);
    expect(s.state).toEqual(initialState(r));
  });

  test('revive rewinds a fatal move once per attempt', () => {
    const r = room(['#####', '#P^E#', '#.#.#', '#...#', '#####']);
    let s = act(newSession(r, 'campaign'), 'right');
    expect(s.state.status).toBe('dead');
    expect(reviveOffer(s)).toBe('rewind');
    s = applyRevive(s);
    expect(s.state.status).toBe('playing');
    expect(s.state.player).toBe(r.start);
    s = act(s, 'right');
    expect(reviveOffer(s)).toBeNull(); // only one revive per attempt
  });

  test('revive grants extra moves when out of moves', () => {
    const r = room(['#######', '#P...E#', '#######'], { moveLimit: 2 });
    let s = act(act(newSession(r, 'campaign'), 'right'), 'right');
    expect(s.state.death).toBe('moves');
    expect(reviveOffer(s)).toBe('extraMoves');
    s = applyRevive(s);
    s = act(act(s, 'right'), 'right');
    expect(s.state.status).toBe('won');
    expect(s.state.bonusMoves).toBe(ECONOMY.ads.reviveExtraMoves);
  });

  test('countdown runs out, and revive adds time', () => {
    const r = room(['######', '#P..E#', '######'], { timeLimit: 10 });
    let s = newSession(r, 'campaign');
    s = tickTimer(s, 4000);
    expect(s.timeLeftMs).toBe(6000);
    s = tickTimer(s, 7000);
    expect(s.timedOut).toBe(true);
    expect(act(s, 'right')).toBe(s); // no input after timeout
    expect(reviveOffer(s)).toBe('extraTime');
    s = applyRevive(s);
    expect(s.timeLeftMs).toBe(ECONOMY.ads.reviveExtraSeconds * 1000);
  });

  test('checkpoints save progress and time', () => {
    const r = room(['#######', '#PC.^E#', '#######'], { timeLimit: 30 });
    let s = act(newSession(r, 'campaign'), 'right');
    s = tickTimer(s, 5000);
    expect(s.checkpoint).toBeDefined();
    s = act(act(s, 'right'), 'right'); // dies on spikes
    expect(s.state.status).toBe('dead');
    s = restoreCheckpoint(s);
    expect(s.state.status).toBe('playing');
    expect(s.state.player).toBe(r.start + 1);
    expect(s.timeLeftMs).toBe(30000);
  });
});

describe('hints', () => {
  test('follows the stored solution from the start', () => {
    const r = getRoom(4)!;
    const stored = (SOLUTIONS as Record<string, string>)[r.id];
    const h = nextMovesHint(r, initialState(r), stored, 3);
    expect(h.kind).toBe('moves');
    if (h.kind === 'moves') expect(h.total).toBe(stored.length);
  });

  test('searches from an off-path state and reports stuck states', () => {
    const r = room(['#######', '#P.%.E#', '#.....#', '#######']);
    const off = step(r, initialState(r), 'down').state;
    const h = nextMovesHint(r, off, undefined, 2);
    expect(h.kind).toBe('moves');
    const dead = room(['######', '#PB#E#', '#..#.#', '######']);
    const stuck = nextMovesHint(dead, initialState(dead), undefined);
    expect(stuck.kind).toBe('stuck');
  });
});

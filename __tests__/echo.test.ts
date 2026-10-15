import { withEcho, withReferenceEcho } from '../src/game/echo';
import { initialState, replay, stateKey, step } from '../src/game/engine';
import { getInterlude } from '../src/game/observer/rooms';
import { solve } from '../src/game/solver/solver';
import type { Action } from '../src/game/types';
import { act, newSession, restart, undo } from '../src/state/session';
import { room } from './helpers';

const L: Action = 'left';
const R: Action = 'right';

// The echo starts where the player starts, replays its track one action per turn, presses
// plates, and fades `linger` turns after its track ends.
const PLATE_ROOM = ['#######', '#_...P#', '#####d#', '#E....#', '#######'];
const echoRoom = (linger = 40) => room(PLATE_ROOM, { echo: { reference: 'LLLL', linger } });

describe('echo engine rule', () => {
  test('rooms without a recording have no echo', () => {
    const r = echoRoom();
    expect(initialState(r).echo).toBeUndefined();
    expect(withEcho(r, [])).toBe(r);
  });

  test('the echo replays its track one action per turn, after the player', () => {
    const r = withEcho(echoRoom(), [L, L]);
    const s0 = initialState(r);
    expect(s0.echo).toBe(r.start);
    const s1 = step(r, s0, 'wait');
    expect(s1.state.echo).toBe(r.start - 1);
    expect(s1.events).toContainEqual({ type: 'echo', from: r.start, to: r.start - 1 });
    const s2 = step(r, s1.state, 'wait');
    expect(s2.state.echo).toBe(r.start - 2);
  });

  test('the echo presses plates: the door opens while it stands there', () => {
    const r = withEcho(echoRoom(), [L, L, L, L]);
    const door = r.tiles.findIndex((t) => t.k === 'door');
    // Without the echo the player cannot get through the door.
    expect(step(echoRoom(), initialState(echoRoom()), 'down').valid).toBe(false);
    let s = initialState(r);
    for (let i = 0; i < 4; i++) s = step(r, s, 'wait').state;
    expect(s.echo).toBe(r.start - 4);
    const through = step(r, s, 'down');
    expect(through.valid).toBe(true);
    expect(through.state.player).toBe(door);
  });

  test('walls stop the echo and it is intangible to the player', () => {
    const r = withEcho(echoRoom(), ['up', 'up']);
    const s1 = step(r, initialState(r), 'left');
    expect(s1.state.echo).toBe(r.start); // walked into a wall: stays
    const s2 = step(r, s1.state, 'right'); // player walks back onto the echo's cell
    expect(s2.valid).toBe(true);
    expect(s2.state.player).toBe(r.start);
    expect(s2.state.status).toBe('playing');
  });

  test('the echo fades after its track plus the linger, and the plate releases', () => {
    const r = withEcho(echoRoom(2), [L, L, L, L]);
    let s = initialState(r);
    const faded: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = step(r, s, 'wait');
      if (res.events.some((e) => e.type === 'echoFaded')) faded.push(i + 1);
      s = res.state;
    }
    expect(faded).toEqual([6]);
    expect(s.echo).toBe(-1);
    expect(step(r, s, 'down').valid).toBe(false); // door closed again
  });

  test('the state key includes the echo, so the solver tells timelines apart', () => {
    const r = withEcho(echoRoom(), [L, L]);
    const a = initialState(r);
    const b = { ...a, echo: a.echo! - 1 };
    expect(stateKey(a, 1)).not.toBe(stateKey(b, 1));
    expect(stateKey({ ...a, echo: -1 }, 1)).toContain('|e-');
  });

  test('the recording is capped at maxRecord', () => {
    const r = room(PLATE_ROOM, { echo: { reference: 'LLLL', maxRecord: 3 } });
    expect(withEcho(r, [L, L, L, L, L, L]).echoTrack).toHaveLength(3);
  });

  test.each(['o02', 'o03', 'o04'])('%s needs an echo, and the reference echo makes it solvable', (id) => {
    const r = getInterlude(id)!.room;
    expect(solve(r).solvable).toBe(false);
    const res = solve(withReferenceEcho(r));
    expect(res.solvable).toBe(true);
    expect(replay(withReferenceEcho(r), res.solution).status).toBe('won');
  });
});

describe('echo in the session', () => {
  test('restart turns the abandoned attempt into the echo', () => {
    const r = echoRoom();
    let s = newSession(r, 'interlude');
    for (const a of [L, L, L, L]) s = act(s, a);
    s = restart(s);
    expect(s.room.echoTrack).toEqual([L, L, L, L]);
    expect(s.state.echo).toBe(r.start);
    expect(s.actions).toEqual([]);
    expect(s.attempt).toBe(2);
  });

  test('an empty attempt keeps the previous echo instead of erasing it', () => {
    let s = newSession(echoRoom(), 'interlude');
    s = act(act(s, L), L);
    s = restart(restart(s));
    expect(s.room.echoTrack).toEqual([L, L]);
  });

  test('undo removes actions from the recording', () => {
    let s = newSession(echoRoom(), 'interlude');
    s = undo(act(act(s, L), L));
    expect(s.actions).toEqual([L]);
    expect(restart(s).room.echoTrack).toEqual([L]);
  });

  test('o02 is winnable after a restart with the right first attempt', () => {
    const base = getInterlude('o02')!.room;
    let s = newSession(base, 'interlude');
    for (const a of [L, L, L, L]) s = act(s, a);
    s = restart(s);
    for (const a of [L, L, R, R, 'down', 'down', L, L, L, L] as Action[]) s = act(s, a);
    expect(s.state.status).toBe('won');
  });

  test('door changes are reported for sound and haptics', () => {
    let s = newSession(withEcho(echoRoom(), [L, L, L, L]), 'interlude', undefined, [L, L, L, L]);
    for (let i = 0; i < 3; i++) s = act(s, 'wait');
    s = act(s, 'wait');
    expect(s.events.some((e) => e.type === 'doors' && e.opened.length === 1)).toBe(true);
  });
});

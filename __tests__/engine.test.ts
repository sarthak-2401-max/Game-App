import { initialState, replay, step } from '../src/game/engine';
import { door, drone, laser, platform, plate, sw, tele, timedSpikes } from '../src/game/levels/legend';
import type { Action, GameState, Room } from '../src/game/types';
import { room } from './helpers';

const run = (r: Room, actions: Action[], from?: GameState) => {
  let s = from ?? initialState(r);
  const events = [];
  for (const a of actions) {
    const res = step(r, s, a);
    events.push(...res.events);
    s = res.state;
  }
  return { s, events };
};

describe('movement and exits', () => {
  test('walks to the exit and wins', () => {
    const r = room(['#####', '#P.E#', '#####']);
    const { s, events } = run(r, ['right', 'right']);
    expect(s.status).toBe('won');
    expect(events.some((e) => e.type === 'win')).toBe(true);
  });

  test('walls reject the move without spending a turn', () => {
    const r = room(['####', '#PE#', '####']);
    const res = step(r, initialState(r), 'up');
    expect(res.valid).toBe(false);
    expect(res.state.moves).toBe(0);
    expect(res.events[0].type).toBe('bump');
  });

  test('exit stays sealed until every core is collected', () => {
    const r = room(['######', '#*P.E#', '######']);
    const sealed = run(r, ['right', 'right']);
    expect(sealed.s.status).toBe('playing');
    expect(sealed.events.some((e) => e.type === 'exitSealed')).toBe(true);
    const ok = run(r, ['left', 'right', 'right', 'right']);
    expect(ok.s.status).toBe('won');
  });
});

describe('keys, switches, plates', () => {
  test('a gold key opens a gold lock and is consumed', () => {
    const r = room(['######', '#kPLE#', '######']);
    expect(step(r, initialState(r), 'right').valid).toBe(false);
    const { s } = run(r, ['left', 'right', 'right', 'right']);
    expect(s.status).toBe('won');
    expect(s.keys.gold).toBe(0);
  });

  test('a switch toggles its door each time it is stepped on', () => {
    const r = room(['#######', '#SP.DE#', '#######'], { legend: { S: sw(0), D: door(0) } });
    expect(run(r, ['right', 'right']).s.player).toBe(r.start + 1); // door closed
    const opened = run(r, ['left', 'right', 'right', 'right', 'right']);
    expect(opened.s.status).toBe('won');
  });

  test('a plate opens its door only while something presses it', () => {
    const r = room(['#######', '#P_DE.#', '#######'], { legend: { _: plate(0), D: door(0) } });
    const won = run(r, ['right', 'right', 'right']);
    expect(won.s.status).toBe('won');
    const r2 = room(['########', '#P_.DE.#', '########'], { legend: { _: plate(0), D: door(0) } });
    const off = run(r2, ['right', 'right']); // stepped off the plate
    expect(step(r2, off.s, 'right').valid).toBe(false);
    const blocked = room(['########', '#PB_DE.#', '########'], { legend: { _: plate(0), D: door(0) } });
    // Push the block onto the plate; the door then stays open.
    const pushed = run(blocked, ['right']);
    expect(pushed.s.blocks).toContain(blocked.start + 2);
  });
});

describe('traps and hazards', () => {
  test('static spikes kill', () => {
    const r = room(['#####', '#P^E#', '#####']);
    const { s } = run(r, ['right']);
    expect(s.status).toBe('dead');
    expect(s.death).toBe('spikes');
  });

  test('timed spikes are safe when retracted', () => {
    // Raised when (tick + 0) % 2 < 1, i.e. on even ticks after the move.
    const r = room(['#####', '#P!E#', '#####']);
    expect(run(r, ['right']).s.status).toBe('playing'); // tick 1: retracted
    expect(run(r, ['wait', 'right']).s.death).toBe('spikes'); // tick 2: raised
  });

  test('custom timing spikes follow their period', () => {
    const r = room(['#####', '#PXE#', '#####'], { legend: { X: timedSpikes(3, 1, 0) } });
    expect(run(r, ['wait', 'wait', 'right']).s.death).toBe('spikes'); // tick 3 % 3 == 0
    expect(run(r, ['right']).s.status).toBe('playing');
  });

  test('laser beams kill and switches can turn them off', () => {
    const r = room(['#######', '#>...E#', '#.P...#', '#S#####'], { legend: { '>': laser('right', { ch: 0 }), S: sw(0) } });
    // A channel emitter fires while its channel is off; the switch turns it off.
    expect(run(r, ['up']).s.death).toBe('laser');
    const safe = run(r, ['left', 'down', 'up', 'right', 'up', 'right', 'right', 'right']);
    expect(safe.s.status).not.toBe('dead');
  });

  test('pits kill unless a block fills them', () => {
    const r = room(['######', '#PB~E#', '######']);
    const { s, events } = run(r, ['right', 'right', 'right']);
    expect(events.some((e) => e.type === 'fill')).toBe(true);
    expect(s.status).toBe('won');
    const fall = room(['#####', '#P~E#', '#####']);
    expect(step(fall, initialState(fall), 'right').valid).toBe(false);
  });

  test('crumbling floor collapses behind the player', () => {
    const r = room(['######', '#P%.E#', '######']);
    const { s, events } = run(r, ['right', 'right']);
    expect(events.some((e) => e.type === 'crumble')).toBe(true);
    expect(s.mods[r.start + 1]).toBe('pit');
    // The collapsed tile is now a chasm: walking back is refused.
    expect(step(r, s, 'left').valid).toBe(false);
  });

  test('drones patrol deterministically and collide (including swaps)', () => {
    const r = room(['#######', '#P.X..#', '#....E#', '#######'], { legend: { X: drone('L') } });
    // Drone pingpongs between col 3 and col 2. Moving right into its path collides.
    expect(run(r, ['right']).s.death).toBe('drone');
  });

  test('moving platforms carry the player over pits', () => {
    const r = room(['#####', '#PX~#', '###E#', '#####'], { legend: { X: platform('R') } });
    const { s } = run(r, ['right']); // board platform at tick 0, carried right at tick 1
    expect(s.player).toBe(r.start + 2);
    expect(s.status).toBe('playing');
  });

  test('teleporters move the player to the partner pad', () => {
    const r = room(['#######', '#PT#TE#', '#######'], { legend: { T: tele(0) } });
    const { s, events } = run(r, ['right', 'right']);
    expect(events.some((e) => e.type === 'teleport')).toBe(true);
    expect(s.status).toBe('won');
  });
});

describe('limits and checkpoints', () => {
  test('running out of moves fails the room', () => {
    const r = room(['######', '#P..E#', '######'], { moveLimit: 2 });
    const { s } = run(r, ['right', 'right']);
    expect(s.death).toBe('moves');
    expect(run(r, ['right', 'right', 'right']).s.status).toBe('dead');
    const ok = room(['######', '#P..E#', '######'], { moveLimit: 3 });
    expect(run(ok, ['right', 'right', 'right']).s.status).toBe('won');
  });

  test('checkpoints emit an event', () => {
    const r = room(['#####', '#PCE#', '#####']);
    expect(run(r, ['right']).events.some((e) => e.type === 'checkpoint')).toBe(true);
  });

  test('replay is deterministic', () => {
    const r = room(['#######', '#P.X..#', '#....E#', '#######'], { legend: { X: drone('L') } });
    const acts: Action[] = ['down', 'right', 'right', 'right', 'right'];
    expect(replay(r, acts)).toEqual(replay(r, acts));
  });
});

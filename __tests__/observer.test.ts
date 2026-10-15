import { withReferenceEcho } from '../src/game/echo';
import { initialState, stateKey, step } from '../src/game/engine';
import { getRoomById } from '../src/game/levels';
import { CLUES, SIGIL_COUNT, clueFlag, type Clue } from '../src/game/observer/clues';
import { evaluate, flagsIn, sigilCount, type Condition, type MemoryView } from '../src/game/observer/conditions';
import { clueCell, clueInReach, cluesFound, fillTemplate, resolveRoom, transmissionsFor } from '../src/game/observer/observer';
import { getInterlude, INTERLUDES, ROOM_ROUTES, ROOM_VARIANTS, variantRoom } from '../src/game/observer/rooms';
import { seenFlag, TRANSMISSIONS } from '../src/game/observer/script';
import { roomPeriod, solve } from '../src/game/solver/solver';
import type { Action, GameState, Room } from '../src/game/types';
import { defaultSave } from '../src/services/storage/saveSchema';
import { memoryView, noteCompletionMemory } from '../src/state/memory';

const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'wait'];
const mem = (flags: Record<string, number> = {}, stats: Partial<MemoryView['stats']> = {}): MemoryView => ({
  flags,
  stats: { failures: 0, hintsUsed: 0, undos: 0, roomsCompleted: 0, ...stats },
});

/** The room a clue lives in, as the player meets it (variant built, echo rooms with their reference echo). */
function roomFor(c: Clue): Room {
  const base = getRoomById(c.room) ?? getInterlude(c.room)?.room;
  if (!base) throw new Error(`no room ${c.room}`);
  const v = c.variant ? ROOM_VARIANTS.find((x) => x.room === c.room && x.id === c.variant) : undefined;
  return withReferenceEcho(v ? variantRoom(base, v) : base);
}

/** Breadth-first search over real game states, stopping at the first state `accept` likes. */
function search(room: Room, from: GameState, accept: (s: GameState, depth: number) => boolean, maxDepth = Infinity, cap = 400_000): boolean {
  const period = roomPeriod(room);
  const queue: [GameState, number][] = [[from, 0]];
  const seen = new Set<string>([stateKey(from, period)]);
  for (let head = 0; head < queue.length && queue.length < cap; head++) {
    const [s, d] = queue[head];
    if (accept(s, d)) return true;
    if (d >= maxDepth || s.status !== 'playing') continue;
    for (const a of ACTIONS) {
      const r = step(room, s, a);
      if (!r.valid || r.state.status === 'dead') continue;
      const k = stateKey(r.state, period);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push([r.state, d + 1]);
    }
  }
  return false;
}

// Every flag a condition may read. Anything else in the data is a typo that would silently never fire.
const ROOM_FLAG = /^(r\d{3}|o\d\d)\.(deaths|hint|revive|done|clean|alt|route\.[a-z]+)$/;
function validFlag(f: string): boolean {
  if (f === 'all.revive') return true;
  if (f.startsWith('clue.')) return CLUES.some((c) => clueFlag(c.id) === f);
  if (f.startsWith('obs.')) return TRANSMISSIONS.some((t) => seenFlag(t.id) === f);
  const m = ROOM_FLAG.exec(f);
  if (!m) return false;
  if (!getRoomById(m[1]) && !getInterlude(m[1])) return false;
  if (m[2].startsWith('route.')) return !!ROOM_ROUTES[m[1]]?.[m[2].slice(6)];
  return true;
}

const PLACEHOLDERS = new Set(['moves', 'deaths', 'totalDeaths', 'totalHints', 'cleanRooms', 'sigils', 'rooms']);
const placeholders = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

describe('WITNESS script data', () => {
  test('ids are unique', () => {
    expect(new Set(TRANSMISSIONS.map((t) => t.id)).size).toBe(TRANSMISSIONS.length);
    expect(new Set(CLUES.map((c) => c.id)).size).toBe(CLUES.length);
  });

  test('every line targets a real room, clue and cell', () => {
    for (const t of TRANSMISSIONS) {
      if (t.room === '*') continue;
      const room = getRoomById(t.room) ?? getInterlude(t.room)?.room;
      expect(room).toBeDefined();
      if (t.trigger.on === 'clue') {
        const id = t.trigger.id;
        expect(CLUES.find((c) => c.id === id)?.room).toBe(t.room);
      }
      if (t.trigger.on === 'cell') {
        const [r, c] = t.trigger.at;
        expect(r < room!.height && c < room!.width).toBe(true);
      }
      if (t.trigger.on === 'pickup') {
        const kind = t.trigger.kind;
        expect(room!.items.some((i) => i.kind === kind)).toBe(true);
      }
    }
  });

  test('every condition reads only flags the game actually writes', () => {
    const conditions: (Condition | undefined)[] = [...TRANSMISSIONS.map((t) => t.when), ...CLUES.map((c) => c.when), ...ROOM_VARIANTS.map((v) => v.when)];
    const bad = conditions.flatMap(flagsIn).filter((f) => !validFlag(f));
    expect(bad).toEqual([]);
  });

  test('every placeholder is one the template filler knows', () => {
    const texts = [...TRANSMISSIONS.map((t) => t.text), ...CLUES.map((c) => c.text)];
    expect(texts.flatMap(placeholders).filter((p) => !PLACEHOLDERS.has(p))).toEqual([]);
  });

  test('sigil lines fire at counts the collection can reach', () => {
    for (const t of TRANSMISSIONS) if (t.trigger.on === 'sigil') expect(t.trigger.count).toBeLessThanOrEqual(SIGIL_COUNT);
  });

  test('there are ten sigils, at most one per room', () => {
    const sigils = CLUES.filter((c) => c.kind === 'sigil');
    expect(sigils).toHaveLength(10);
    expect(new Set(sigils.map((c) => c.room)).size).toBe(10);
  });
});

describe('clue placement', () => {
  test.each(CLUES.map((c) => [c.id, c] as const))('%s sits on a sensible cell', (_id, c) => {
    const room = roomFor(c);
    const cell = clueCell(room, c);
    const t = room.tiles[cell];
    expect(t).toBeDefined();
    if (c.kind === 'wall') expect(t.k).toBe('wall');
    else expect(['floor', 'plate', 'checkpoint']).toContain(t.k);
    expect(room.items.some((i) => i.cell === cell)).toBe(false);
  });

  // Clues are optional, but each must be findable on a run that still wins.
  test.each(CLUES.map((c) => [c.id, c] as const))('%s can be found on a winning run', (_id, c) => {
    const room = roomFor(c);
    const ok = search(room, initialState(room), (s) => clueInReach(room, c, s.player) && solve(room, { from: s, maxNodes: 200_000 }).solvable);
    expect(ok).toBe(true);
  });

  test('the dark clue in room 2 can be read before the lights come back', () => {
    const c = CLUES.find((x) => x.reveal === 'dark')!;
    const room = roomFor(c);
    const line = TRANSMISSIONS.find((t) => t.room === c.room && t.lights)!;
    const turns = line.lights!.turns;
    // From any state right after the key pickup, the clue must be in reach within the dark turns.
    const keyAt = room.items.findIndex((i) => i.kind === 'key');
    const afterPickup = search(room, initialState(room), (s) => (s.itemsTaken & (1 << keyAt)) !== 0 && search(room, s, (t) => clueInReach(room, c, t.player), turns));
    expect(afterPickup).toBe(true);
  });

  test('dark clues stay hidden while the lights are on', () => {
    const c = CLUES.find((x) => x.reveal === 'dark')!;
    const room = roomFor(c);
    const s = { ...initialState(room), player: clueCell(room, c) + room.width }; // floor below
    expect(cluesFound(room, [c], s, mem(), false)).toEqual([]);
    expect(cluesFound(room, [c], s, mem(), true)).toEqual([c]);
    expect(cluesFound(room, [c], s, mem({ [clueFlag(c.id)]: 1 }), true)).toEqual([]);
  });
});

describe('conditions and room memory', () => {
  test('corrupted or missing flags read as zero and never throw', () => {
    const junk = mem({ 'o01.route.observer': NaN, 'r004.hint': Infinity } as Record<string, number>);
    expect(evaluate({ flag: 'o01.route.observer' }, junk)).toBe(false);
    expect(evaluate({ flag: 'r004.hint' }, junk)).toBe(false);
    expect(evaluate({ not: { flag: 'nothing' } }, mem())).toBe(true);
    expect(evaluate({ all: [] }, mem())).toBe(true);
    expect(evaluate({ any: [] }, mem())).toBe(false);
  });

  test('only real marks count toward the sigil collection', () => {
    expect(sigilCount(mem({ 'clue.sigil1': 1, 'clue.sigil99': 1, 'clue.sigilX': 1 }))).toBe(1);
  });

  test('every room variant and its base are both solvable, whatever the memory says', () => {
    for (const v of ROOM_VARIANTS) {
      const base = getRoomById(v.room)!;
      expect(solve(base).solvable).toBe(true);
      expect(solve(variantRoom(base, v)).solvable).toBe(true);
      expect(resolveRoom(base, mem()).variant).toBeUndefined();
      expect(resolveRoom(base, mem({ 'o01.route.observer': 1 })).variant).toBe(v.id);
    }
  });

  test('trusting WITNESS in o01 is recorded from the route taken, on the first completion only', () => {
    const room = getInterlude('o01')!.room;
    const left = 1 * room.width + 1;
    const right = 1 * room.width + 7;
    let s = noteCompletionMemory(defaultSave(), room, { usedUndo: false, visited: [room.start, left] });
    expect(s.memory.flags['o01.route.observer']).toBe(1);
    expect(s.memory.flags['o01.route.hale']).toBeUndefined();
    s = noteCompletionMemory(s, room, { usedUndo: true, visited: [room.start, right] });
    expect(s.memory.flags['o01.route.hale']).toBeUndefined();
    expect(s.memory.flags['o01.done']).toBe(2);
    expect(s.memory.flags['o01.clean']).toBe(1);
  });

  test('both exits of o01 are reachable', () => {
    const room = getInterlude('o01')!.room;
    for (const [r, c] of [...ROOM_ROUTES.o01.observer, ...ROOM_ROUTES.o01.hale]) {
      expect(search(room, initialState(room), (s) => s.player === r * room.width + c)).toBe(true);
    }
  });
});

describe('transmissions', () => {
  test('a line plays once, then stays in the archive', () => {
    const first = transmissionsFor('r001', { on: 'move', n: 1 }, mem());
    expect(first.map((t) => t.id)).toEqual(['w01']);
    expect(transmissionsFor('r001', { on: 'move', n: 1 }, mem({ [seenFlag('w01')]: 1 }))).toEqual([]);
  });

  test('the first choice changes what WITNESS says next', () => {
    expect(transmissionsFor('r011', { on: 'start' }, mem({ 'o01.route.observer': 1 })).map((t) => t.id)).toEqual(['w16']);
    expect(transmissionsFor('r011', { on: 'start' }, mem({ 'o01.route.hale': 1 })).map((t) => t.id)).toEqual(['w17']);
    expect(transmissionsFor('r011', { on: 'start' }, mem())).toEqual([]);
  });

  test('earlier behaviour picks between exclusive lines', () => {
    const helped = transmissionsFor('r005', { on: 'start' }, mem({ 'r004.hint': 1, 'r004.done': 1 }));
    const alone = transmissionsFor('r005', { on: 'start' }, mem({ 'r004.done': 1 }));
    expect(helped.map((t) => t.id)).toEqual(['w06']);
    expect(alone.map((t) => t.id)).toEqual(['w07']);
  });

  test('failure lines fire once the threshold is reached', () => {
    expect(transmissionsFor('r003', { on: 'fail', deaths: 1 }, mem())).toEqual([]);
    expect(transmissionsFor('r003', { on: 'fail', deaths: 2 }, mem()).map((t) => t.id)).toEqual(['w05']);
  });

  test('templates fill from the save and never show raw names', () => {
    const m = mem({ 'r001.clean': 1, 'r002.clean': 1, 'clue.sigil3': 1 }, { failures: 4, hintsUsed: 2, roomsCompleted: 9 });
    expect(fillTemplate('{totalDeaths}/{totalHints}/{cleanRooms}/{sigils}/{rooms}', m)).toBe('4/2/2/1/9');
    expect(fillTemplate('Exit in {moves} moves', m, { moves: 7 })).toBe('Exit in 7 moves');
    expect(fillTemplate('Exit in {moves} moves', m)).toBe('Exit in … moves');
    expect(fillTemplate('a{nope}b', m)).toBe('ab');
  });

  test('memoryView reads stats from the save', () => {
    const s = defaultSave();
    const v = memoryView({ ...s, stats: { ...s.stats, failures: 3 } });
    expect(v.stats.failures).toBe(3);
  });

  test('interludes follow rooms 10, 30 and 50, and the secret room is separate', () => {
    expect(INTERLUDES.map((i) => [i.id, i.after])).toEqual([
      ['o01', 10],
      ['o02', 30],
      ['o03', 50],
      ['o04', 0],
    ]);
  });
});

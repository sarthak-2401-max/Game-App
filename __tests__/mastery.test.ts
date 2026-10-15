import { getRoom } from '../src/game/levels';
import { clueFlag } from '../src/game/observer/clues';
import { getInterlude } from '../src/game/observer/rooms';
import { defaultSave, migrate, sanitize, SAVE_VERSION, type SaveData } from '../src/services/storage/saveSchema';
import {
  backfillStars,
  movesTarget,
  parFor,
  STAR_ESCAPE,
  STAR_MOVES,
  STAR_OBJECTIVE,
  starCount,
  starCriteria,
  starsForWin,
  totalStars,
} from '../src/state/mastery';
import { claimDaily, completeRoom, discoverClue, recordDailyResult } from '../src/state/progression';

const day = '2026-10-15';
const at = new Date(`${day}T12:00:00`);
const run = { moves: 10, usedUndo: false, itemsTaken: 0, failedAttempts: 0 };

describe('mastery stars', () => {
  test('the move target leaves room for learning, and respects move limits', () => {
    expect(movesTarget(getRoom(1)!, 10)).toBe(12);
    expect(movesTarget(getRoom(1)!, 30)).toBe(36);
    const limited = { ...getRoom(1)!, moveLimit: 20 };
    expect(movesTarget(limited, 14)).toBe(17);
    expect(movesTarget(limited, 20)).toBe(20);
  });

  test('every campaign room and interlude has a par and an objective', () => {
    for (let n = 1; n <= 100; n++) {
      const r = getRoom(n)!;
      expect(parFor(r)).toBeGreaterThan(0);
      expect(starCriteria(r).objectiveLabel.length).toBeGreaterThan(0);
    }
    for (const id of ['o01', 'o02', 'o03', 'o04']) expect(parFor(getInterlude(id)!.room)).toBeGreaterThan(0);
  });

  test('escape is always a star; undo and hints never cost the escape or move stars', () => {
    const r = getRoom(1)!;
    const crit = starCriteria(r);
    const s = starsForWin(r, { moves: crit.movesTarget, usedUndo: true, itemsTaken: 0 }, defaultSave(), crit);
    expect(s & STAR_ESCAPE).toBeTruthy();
    expect(s & STAR_MOVES).toBeTruthy();
    expect(starsForWin(r, { moves: 999, usedUndo: false, itemsTaken: 0 }, defaultSave(), crit) & STAR_MOVES).toBe(0);
  });

  test('coin objectives count coins found on earlier runs', () => {
    const n = Array.from({ length: 100 }, (_, i) => i + 1).find((i) => starCriteria(getRoom(i)!).objective === 'coins')!;
    const r = getRoom(n)!;
    const all = r.items.reduce((m, it, i) => (it.kind === 'coin' ? m | (1 << i) : m), 0);
    const save = { ...defaultSave(), rooms: { [r.id]: { completed: true, completions: 1, coinsFound: all, attempts: 1, rewarded: true } } };
    expect(starsForWin(r, { moves: 999, usedUndo: true, itemsTaken: 0 }, save) & STAR_OBJECTIVE).toBeTruthy();
  });

  test('sigil objectives are met once the mark is found, on any run', () => {
    const r = getRoom(16)!;
    expect(starCriteria(r).objective).toBe('sigil');
    const base = defaultSave();
    expect(starsForWin(r, { ...run, moves: 999 }, base) & STAR_OBJECTIVE).toBe(0);
    const found = discoverClue(base, 'sigil2').save;
    expect(starsForWin(r, { ...run, moves: 999 }, found) & STAR_OBJECTIVE).toBeTruthy();
  });

  test('a room keeps the union of its stars, and a worse run never removes one', () => {
    const r = getRoom(1)!;
    let s = completeRoom(defaultSave(), r, { ...run, stars: STAR_ESCAPE | STAR_MOVES }).save;
    const res = completeRoom(s, r, { ...run, stars: STAR_ESCAPE | STAR_OBJECTIVE });
    s = res.save;
    expect(s.rooms.r001.stars).toBe(7);
    expect(res.bestStars).toBe(7);
    expect(starCount(completeRoom(s, r, { ...run, stars: STAR_ESCAPE }).save.rooms.r001.stars)).toBe(3);
    expect(totalStars(s)).toBe(3);
  });

  test('old saves are backfilled once with the stars they provably earned', () => {
    const r = getRoom(1)!;
    const crit = starCriteria(r);
    const old: SaveData = { ...defaultSave(), rooms: { r001: { completed: true, completions: 1, bestMoves: crit.movesTarget, coinsFound: 0, attempts: 1, rewarded: true } } };
    const once = backfillStars(old);
    expect(once.rooms.r001.stars! & (STAR_ESCAPE | STAR_MOVES)).toBe(STAR_ESCAPE | STAR_MOVES);
    expect(once.memory.flags['sys.starsBackfilled']).toBe(1);
    expect(backfillStars(once)).toBe(once);
    // Rooms that already have stars are left alone.
    const kept = backfillStars({ ...old, rooms: { r001: { ...old.rooms.r001, stars: 1 } } });
    expect(kept.rooms.r001.stars).toBe(1);
  });
});

describe('clue collection', () => {
  test('finding a clue is idempotent', () => {
    const a = discoverClue(defaultSave(), 'c01');
    expect(a.isNew).toBe(true);
    const b = discoverClue(a.save, 'c01');
    expect(b.isNew).toBe(false);
    expect(b.save).toBe(a.save);
  });

  test('five marks pay the collection achievement once and unlock the trail', () => {
    let s = defaultSave();
    const coins0 = s.coins;
    const unlocked: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = discoverClue(s, `sigil${i}`);
      unlocked.push(...r.achievements);
      s = r.save;
    }
    expect(unlocked).toEqual(['sigils_5']);
    expect(s.coins).toBe(coins0 + 40);
    expect(s.cosmetics.owned).toContain('trail_static');
    const again = discoverClue(s, 'sigil5');
    expect(again.achievements).toEqual([]);
    expect(again.save.coins).toBe(s.coins);
  });
});

describe('daily score', () => {
  test('a daily score is recorded on the claim, best-of, and never pays coins again', () => {
    const claimed = claimDaily(defaultSave(), day, at);
    expect(claimed.ok).toBe(true);
    const s0 = claimed.save;
    const r1 = recordDailyResult(s0, day, STAR_ESCAPE | STAR_MOVES, 20, at);
    expect(r1.save.daily.claims[day].stars).toBe(3);
    expect(r1.save.daily.claims[day].bestMoves).toBe(20);
    expect(r1.save.coins).toBe(s0.coins);
    const r2 = recordDailyResult(r1.save, day, STAR_ESCAPE, 25, at);
    expect(r2.save).toBe(r1.save); // nothing better: nothing changes
    const r3 = recordDailyResult(r1.save, day, 7, 18, at);
    expect(r3.achievements).toEqual(['daily_master']);
    expect(r3.save.daily.claims[day]).toMatchObject({ stars: 7, bestMoves: 18 });
    expect(recordDailyResult(r3.save, day, 7, 18, at).achievements).toEqual([]);
  });

  test('a day with no claim is not scored', () => {
    const s = defaultSave();
    expect(recordDailyResult(s, day, 7, 10, at).save).toBe(s);
  });

  test('a replayed daily cannot be claimed twice', () => {
    const s = claimDaily(defaultSave(), day, at).save;
    expect(claimDaily(s, day, at).ok).toBe(false);
  });
});

describe('save v3', () => {
  test('a v2 save migrates to v3 without losing anything', () => {
    const v2 = { ...defaultSave(), version: 2, coins: 321, rooms: { r001: { completed: true, completions: 2, bestMoves: 4, coinsFound: 0, attempts: 3, rewarded: true } } } as Record<string, unknown>;
    delete v2.memory;
    const s = migrate(v2);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.coins).toBe(321);
    expect(s.rooms.r001).toMatchObject({ completed: true, completions: 2, bestMoves: 4 });
    expect(s.memory.flags).toEqual({});
  });

  test('corrupted memory flags, stars and daily scores are dropped, valid ones kept', () => {
    const raw = {
      ...defaultSave(),
      memory: { flags: { 'r001.done': 2, 'o01.route.observer': 1, 'bad key!': 1, 'r002.hint': -3, 'r003.clean': 'yes', 'r004.done': 1e12, [clueFlag('sigil1')]: NaN } },
      rooms: { r001: { completed: true, completions: 1, coinsFound: 0, attempts: 1, rewarded: true, stars: 99 } },
      daily: { ...defaultSave().daily, claims: { [day]: { completedAt: at.toISOString(), reward: 30, stars: 'x', bestMoves: -4 } } },
    } as unknown as Parameters<typeof sanitize>[0];
    const s = sanitize(raw);
    expect(s.memory.flags).toEqual({ 'r001.done': 2, 'o01.route.observer': 1, 'r004.done': 1_000_000 });
    expect(s.rooms.r001.stars).toBeUndefined();
    expect(s.rooms.r001.completed).toBe(true);
    expect(s.daily.claims[day].stars).toBeUndefined();
    expect(s.daily.claims[day].bestMoves).toBeUndefined();
    expect(s.daily.claims[day].reward).toBe(30);
  });

  test('a missing or broken memory block becomes empty', () => {
    expect(sanitize({ ...defaultSave(), memory: 'oops' } as unknown as Parameters<typeof sanitize>[0]).memory.flags).toEqual({});
    expect(sanitize({ ...defaultSave(), memory: { flags: [1, 2] } } as unknown as Parameters<typeof sanitize>[0]).memory.flags).toEqual({});
  });
});

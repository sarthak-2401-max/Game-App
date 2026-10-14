import { POWERUPS, POWERUP_TUNING } from '../src/config/powerups';
import { step } from '../src/game/engine';
import type { GameState } from '../src/game/types';
import { drone } from '../src/game/levels/legend';
import { getRoom, roomId } from '../src/game/levels';
import { CHAPTER_STORY, EPILOGUE, ROOM_STORY } from '../src/game/story';
import { defaultSave, migrate, sanitize } from '../src/services/storage/saveSchema';
import { addPowerUp, buyPowerUp, consumePowerUp, grantChapterPowerUps, syncPowerUpUnlocks } from '../src/state/powerups';
import { completeRoom, grantRewardedAd } from '../src/state/progression';
import { act, applyPowerUp, newSession, powerUpBlocked } from '../src/state/session';
import { markChapterIntroSeen } from '../src/state/story';
import { room } from './helpers';

const completed = (upTo: number) => {
  const s = defaultSave();
  for (let i = 1; i <= upTo; i++) s.rooms[roomId(i)] = { completed: true, completions: 1, coinsFound: 0, attempts: 1, rewarded: true };
  return s;
};

describe('power-up progression', () => {
  test('each power-up unlocks once, after its room, with starter stock', () => {
    const before = syncPowerUpUnlocks(completed(4));
    expect(before.grants).toEqual([]);
    const after = syncPowerUpUnlocks(completed(5));
    expect(after.grants).toEqual([{ id: 'pathfinder', count: 2, reason: 'unlocked' }]);
    expect(after.save.powerups.inventory.pathfinder).toBe(2);
    expect(syncPowerUpUnlocks(after.save).grants).toEqual([]);
  });

  test('completing the unlock room reports the new power-up', () => {
    const r = completeRoom(completed(4), getRoom(5)!, { moves: 10, usedUndo: false, itemsTaken: 0, failedAttempts: 0 });
    expect(r.powerups.map((g) => g.id)).toContain('pathfinder');
  });

  test('chapter milestones pay only unlocked power-ups', () => {
    const s = syncPowerUpUnlocks(completed(10)).save;
    const g = grantChapterPowerUps(s, 4); // overclock (locked) + shield (locked)
    expect(g.grants).toEqual([]);
    const g1 = grantChapterPowerUps(s, 1);
    expect(g1.save.powerups.inventory.pathfinder).toBe(3);
  });

  test('buying costs coins and needs the power-up unlocked', () => {
    const locked = buyPowerUp({ ...defaultSave(), coins: 1000 }, 'freeze');
    expect(locked.ok).toBe(false);
    const s = { ...syncPowerUpUnlocks(completed(50)).save, coins: 150 };
    const r = buyPowerUp(s, 'freeze');
    expect(r.ok && r.save.coins).toBe(150 - POWERUPS.find((p) => p.id === 'freeze')!.coinPrice);
    expect(r.save.powerups.inventory.freeze).toBe(3);
    expect(buyPowerUp({ ...s, coins: 10 }, 'freeze').ok).toBe(false);
  });

  test('consuming stops at zero', () => {
    let s = addPowerUp(syncPowerUpUnlocks(completed(20)).save, 'shield', -2);
    expect(consumePowerUp(s, 'shield')).toBeNull();
    s = addPowerUp(s, 'shield', 1);
    const c = consumePowerUp(s, 'shield')!;
    expect(c.powerups.inventory.shield).toBe(0);
    expect(c.powerups.used).toBe(1);
  });

  test('a rewarded ad grants one power-up within the daily limit', () => {
    let s = syncPowerUpUnlocks(completed(5)).save;
    for (let i = 0; i < POWERUP_TUNING.adDailyLimit; i++) {
      const g = grantRewardedAd(s, 'powerup', `t${i}`, new Date(2026, 5, 1), { powerUpId: 'pathfinder' });
      expect(g.granted).toBe(true);
      s = g.save;
    }
    expect(s.powerups.inventory.pathfinder).toBe(2 + POWERUP_TUNING.adDailyLimit);
    expect(grantRewardedAd(s, 'powerup', 'tx', new Date(2026, 5, 1), { powerUpId: 'pathfinder' }).granted).toBe(false);
  });

  test('saves without power-ups or story load with defaults, and junk is dropped', () => {
    const s = sanitize({ version: 2, powerups: { inventory: { shield: 3, nope: 9, freeze: 'x' }, unlocked: ['shield', 'bogus'] }, story: { chaptersSeen: [1, 'a'] } });
    expect(s.powerups).toEqual({ inventory: { shield: 3, freeze: 0 }, unlocked: ['shield'], used: 0 });
    expect(s.story).toEqual({ chaptersSeen: [1], epilogueSeen: false });
    expect(migrate({ version: 1, coins: 5, completed: [1] }).powerups.unlocked).toEqual([]);
    expect(markChapterIntroSeen(s, 1)).toBe(s);
  });
});

describe('power-up effects', () => {
  test('shield cancels a fatal move once', () => {
    const r = room(['#####', '#P^E#', '#.#.#', '#...#', '#####']);
    let s = applyPowerUp(newSession(r, 'campaign'), 'shield');
    expect(s.shieldArmed).toBe(true);
    s = act(s, 'right');
    expect(s.state.status).toBe('playing');
    expect(s.state.player).toBe(r.start);
    expect(s.shieldArmed).toBe(false);
    expect(s.events[0].type).toBe('shielded');
    expect(act(s, 'right').state.status).toBe('dead');
  });

  test('shield does not cancel running out of moves', () => {
    const r = room(['######', '#P..E#', '######'], { moveLimit: 1 });
    const s = act(applyPowerUp(newSession(r, 'campaign'), 'shield'), 'right');
    expect(s.state.death).toBe('moves');
  });

  test('overclock adds moves or time and is blocked where it does nothing', () => {
    const plain = room(['######', '#P..E#', '######']);
    expect(powerUpBlocked(newSession(plain, 'campaign'), 'overclock')).toBe('no_effect');
    const limited = room(['######', '#P..E#', '######'], { moveLimit: 2 });
    expect(applyPowerUp(newSession(limited, 'campaign'), 'overclock').state.bonusMoves).toBe(POWERUP_TUNING.overclockMoves);
    const timed = room(['######', '#P..E#', '######'], { timeLimit: 10 });
    expect(applyPowerUp(newSession(timed, 'campaign'), 'overclock').timeLeftMs).toBe(10_000 + POWERUP_TUNING.overclockSeconds * 1000);
  });

  test('freeze stops drones for its turns, then the clock resumes', () => {
    const r = room(['#######', '#P....#', '#..X.E#', '#######'], { legend: { X: drone('LR') } });
    expect(powerUpBlocked(newSession(room(['#####', '#P.E#', '#####']), 'campaign'), 'freeze')).toBe('no_effect');
    let st: GameState = { ...newSession(r, 'campaign').state, frozen: POWERUP_TUNING.freezeTurns };
    for (let i = 0; i < POWERUP_TUNING.freezeTurns; i++) {
      st = step(r, st, 'wait').state;
      expect(st.tick).toBe(0);
    }
    expect(st.frozen).toBe(0);
    st = step(r, st, 'wait').state;
    expect(st.tick).toBe(1);
  });
});

describe('story', () => {
  test('one beat per campaign room, ten chapter openings, and an epilogue', () => {
    expect(ROOM_STORY).toHaveLength(100);
    expect(CHAPTER_STORY.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(EPILOGUE.length).toBeGreaterThan(0);
    for (const b of [...ROOM_STORY, ...EPILOGUE, ...CHAPTER_STORY.flatMap((c) => c.opening)]) {
      expect(b.text.length).toBeLessThanOrEqual(160);
      expect(b.text).not.toMatch(/—/);
    }
  });
});

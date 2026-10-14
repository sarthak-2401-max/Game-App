import { ACHIEVEMENTS } from '../src/config/achievements';
import { ECONOMY } from '../src/config/economy';
import { CAMPAIGN, getRoom } from '../src/game/levels';
import { defaultSave, type SaveData } from '../src/services/storage/saveSchema';
import {
  chapterProgress,
  claimDaily,
  completeRoom,
  continueRoom,
  isRoomUnlocked,
  liveStreak,
  purchaseCosmetic,
  recordFailure,
  selectCosmetic,
  unlockBonusRoomWithCoins,
} from '../src/state/progression';

const run = { moves: 10, usedUndo: false, itemsTaken: 0, failedAttempts: 0 };
const at = (iso: string) => new Date(`${iso}T12:00:00`);

function clear(save: SaveData, n: number, extra: Partial<typeof run> = {}) {
  return completeRoom(save, getRoom(n)!, { ...run, ...extra });
}

describe('campaign progression', () => {
  test('only room 1 is unlocked at first and completing unlocks the next', () => {
    let s = defaultSave();
    expect(isRoomUnlocked(s, 1)).toBe(true);
    expect(isRoomUnlocked(s, 2)).toBe(false);
    s = clear(s, 1).save;
    expect(isRoomUnlocked(s, 2)).toBe(true);
    expect(continueRoom(s)).toBe(2);
  });

  test('completion pays once; replays pay nothing', () => {
    const s0 = defaultSave();
    const first = clear(s0, 1);
    expect(first.firstClear).toBe(true);
    expect(first.save.coins - s0.coins).toBeGreaterThanOrEqual(ECONOMY.firstRoomReward);
    const again = completeRoom(first.save, getRoom(1)!, run);
    expect(again.firstClear).toBe(false);
    expect(again.save.coins).toBe(first.save.coins);
    expect(again.doubleEligibleAmount).toBe(0);
  });

  test('room coins pay once each, hidden coins pay more', () => {
    const room = CAMPAIGN.find((r) => r.items.some((i) => i.kind === 'coin' && !i.hidden))!;
    const ci = room.items.findIndex((i) => i.kind === 'coin' && !i.hidden);
    let s = defaultSave();
    s = { ...s, highestUnlocked: 100 };
    const a = completeRoom(s, room, { ...run, itemsTaken: 1 << ci });
    const coinLine = a.rewards.find((r) => r.kind === 'coin');
    expect(coinLine?.amount).toBe(ECONOMY.roomCoinValue);
    const b = completeRoom(a.save, room, { ...run, itemsTaken: 1 << ci });
    expect(b.rewards.find((r) => r.kind === 'coin')).toBeUndefined();

    const hiddenRoom = CAMPAIGN.find((r) => r.items.some((i) => i.hidden));
    if (hiddenRoom) {
      const hi = hiddenRoom.items.findIndex((i) => i.hidden);
      const h = completeRoom(s, hiddenRoom, { ...run, itemsTaken: 1 << hi });
      expect(h.rewards.find((r) => r.kind === 'coin')?.amount).toBe(ECONOMY.hiddenCoinValue);
      expect(h.achievements).toContain('hidden_coin');
    }
  });

  test('finishing a chapter pays the chapter bonus once and unlocks achievements', () => {
    let s = defaultSave();
    let last;
    for (let n = 1; n <= 10; n++) {
      last = clear(s, n);
      s = last.save;
    }
    expect(last!.chapterCompleted).toBe(1);
    expect(last!.rewards.some((r) => r.kind === 'chapter' && r.amount === ECONOMY.chapterBonus)).toBe(true);
    expect(chapterProgress(s, 1)).toBe(10);
    expect(s.achievements.first_escape.unlockedAt).toBeDefined();
    expect(s.achievements.rooms_5.unlockedAt).toBeDefined();
    expect(s.achievements.chapter_clear.unlockedAt).toBeDefined();
    expect(s.achievements.flawless_chapter.unlockedAt).toBeDefined();
    expect(s.tutorialCompleted).toBe(true);
  });

  test('a failure inside a chapter blocks the flawless achievement', () => {
    let s = recordFailure(defaultSave(), getRoom(3)!);
    for (let n = 1; n <= 10; n++) s = clear(s, n).save;
    expect(s.achievements.flawless_chapter?.unlockedAt).toBeUndefined();
  });

  test('efficiency and no-undo achievements only from chapter 2 onward', () => {
    let s = { ...defaultSave(), highestUnlocked: 20 };
    const early = completeRoom(s, getRoom(2)!, { ...run, moves: 3, parMoves: 3 });
    expect(early.achievements).not.toContain('efficient');
    s = early.save;
    const later = completeRoom(s, getRoom(11)!, { ...run, moves: 5, parMoves: 5 });
    expect(later.achievements).toEqual(expect.arrayContaining(['efficient', 'no_undo']));
  });

  test('achievement ids are unique', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('daily challenge and streak', () => {
  test('claims once per day and rejects other days', () => {
    const s = defaultSave(at('2026-10-14'));
    const ok = claimDaily(s, '2026-10-14', at('2026-10-14'));
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.save.coins).toBe(s.coins + ECONOMY.dailyReward + ACHIEVEMENTS.find((a) => a.id === 'daily_first')!.reward);
    const dup = claimDaily(ok.save, '2026-10-14', at('2026-10-14'));
    expect(dup).toMatchObject({ ok: false, reason: 'already_claimed' });
    expect(claimDaily(ok.save, '2026-10-13', at('2026-10-14'))).toMatchObject({ ok: false, reason: 'not_today' });
  });

  test('streak grows daily, survives one missed day, resets after two', () => {
    let s = defaultSave(at('2026-10-01'));
    const claim = (day: string) => {
      const r = claimDaily(s, day, at(day));
      if (!r.ok) throw new Error(r.reason);
      s = r.save;
    };
    claim('2026-10-01');
    claim('2026-10-02');
    expect(s.daily.streak.count).toBe(2);
    claim('2026-10-04'); // missed one day: grace
    expect(s.daily.streak.count).toBe(3);
    expect(s.achievements.streak_3.unlockedAt).toBeDefined();
    expect(liveStreak(s, '2026-10-06')).toBe(3);
    expect(liveStreak(s, '2026-10-07')).toBe(0);
    claim('2026-10-07'); // missed two days: reset
    expect(s.daily.streak.count).toBe(1);
    expect(s.daily.streak.best).toBe(3);
  });

  test('streak bonus is capped', () => {
    let s = defaultSave(at('2026-01-01'));
    let last = 0;
    for (let d = 1; d <= 20; d++) {
      const day = `2026-01-${String(d).padStart(2, '0')}`;
      const r = claimDaily(s, day, at(day));
      if (!r.ok) throw new Error(r.reason);
      last = r.rewards.find((x) => x.kind === 'streak')?.amount ?? 0;
      s = r.save;
    }
    expect(last).toBe(ECONOMY.streak.maxBonus);
  });

  test('a clock moved far backwards cannot farm rewards', () => {
    let s = defaultSave(at('2026-10-14'));
    s = { ...s, daily: { ...s.daily, latestDaySeen: '2026-10-20' } };
    expect(claimDaily(s, '2026-10-14', at('2026-10-14'))).toMatchObject({ ok: false, reason: 'clock_rollback' });
  });
});

describe('shop', () => {
  test('buys, rejects duplicates and insufficient funds, and equips', () => {
    let s = { ...defaultSave(), coins: 120 };
    const r = purchaseCosmetic(s, 'skin_mint');
    expect(r.ok).toBe(true);
    s = r.save;
    expect(s.coins).toBe(20);
    expect(purchaseCosmetic(s, 'skin_mint')).toMatchObject({ ok: false, reason: 'owned' });
    expect(purchaseCosmetic(s, 'skin_violet')).toMatchObject({ ok: false, reason: 'insufficient' });
    expect(purchaseCosmetic({ ...s, coins: 9999 }, 'skin_gold')).toMatchObject({ ok: false, reason: 'not_for_sale' });
    s = selectCosmetic(s, 'skin_mint');
    expect(s.cosmetics.selected.skin).toBe('skin_mint');
    expect(selectCosmetic(s, 'skin_white').cosmetics.selected.skin).toBe('skin_mint'); // not owned
  });

  test('bonus rooms can be bought with coins once', () => {
    const s = { ...defaultSave(), coins: ECONOMY.bonusRoomPrice };
    const r = unlockBonusRoomWithCoins(s, 'b01');
    expect(r.ok).toBe(true);
    expect(r.save.coins).toBe(0);
    expect(unlockBonusRoomWithCoins({ ...r.save, coins: 999 }, 'b01').ok).toBe(false);
  });
});

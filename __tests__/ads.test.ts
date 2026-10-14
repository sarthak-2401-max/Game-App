import { INTERSTITIAL_POLICY } from '../src/config/ads';
import { ECONOMY } from '../src/config/economy';
import { AdService } from '../src/services/ads/adService';
import { MockAdProvider, type MockAdRequest } from '../src/services/ads/mockProvider';
import type { AdProvider, PresentationHandlers } from '../src/services/ads/types';
import { defaultSave } from '../src/services/storage/saveSchema';
import {
  grantRewardedAd,
  noteRoomForInterstitial,
  recordInterstitialShown,
  rewardedUsesLeft,
  shouldShowInterstitial,
} from '../src/state/progression';

async function setup(drive: (req: MockAdRequest) => void) {
  const provider = new MockAdProvider({ loadDelayMs: 0 });
  provider.attachHost((req) => req && drive(req));
  const svc = new AdService();
  svc.setProvider(provider);
  await svc.initialize({ nonPersonalized: true });
  return svc;
}

describe('rewarded ads only reward a verified earned callback', () => {
  test('completed ad resolves as earned with a token', async () => {
    const svc = await setup((r) => r.complete());
    const res = await svc.presentRewarded('hint');
    expect(res.outcome).toBe('earned');
    expect(res.token).toMatch(/.+/);
  });

  test('closing early is dismissed, not earned', async () => {
    const svc = await setup((r) => r.dismiss());
    expect((await svc.presentRewarded('revive')).outcome).toBe('dismissed');
  });

  test('a failed ad is reported as failed', async () => {
    const svc = await setup((r) => r.fail());
    expect((await svc.presentRewarded('bonus_coins')).outcome).toBe('failed');
  });

  test('no provider or nothing loaded means unavailable', async () => {
    const svc = new AdService();
    expect((await svc.presentRewarded('hint')).outcome).toBe('unavailable');
    const empty = new MockAdProvider({ fillRate: 0, loadDelayMs: 0 });
    empty.attachHost(() => undefined);
    const svc2 = new AdService();
    svc2.setProvider(empty);
    await svc2.initialize({ nonPersonalized: true });
    expect((await svc2.presentRewarded('hint')).outcome).toBe('unavailable');
  });

  test('duplicate SDK callbacks resolve once; earned survives a later error', async () => {
    let handlers: PresentationHandlers | null = null;
    const provider: AdProvider = {
      name: 'fake',
      isSimulation: true,
      initialize: async () => undefined,
      loadRewarded: () => undefined,
      isRewardedReady: () => true,
      showRewarded: (h) => {
        handlers = h;
      },
      loadInterstitial: () => undefined,
      isInterstitialReady: () => false,
      showInterstitial: () => undefined,
    };
    const svc = new AdService();
    svc.setProvider(provider);
    await svc.initialize({ nonPersonalized: false });
    const p = svc.presentRewarded('double_reward');
    const h = handlers as unknown as PresentationHandlers;
    h.onEarned?.();
    h.onEarned?.();
    h.onError('late error');
    h.onClosed();
    const res = await p;
    expect(res.outcome).toBe('earned');
    expect(svc.isShowing).toBe(false);
  });
});

describe('reward ledger', () => {
  const now = new Date('2026-10-14T12:00:00');

  test('a token is granted at most once', () => {
    const s = defaultSave();
    const a = grantRewardedAd(s, 'bonus_coins', 'tok-1', now);
    expect(a.granted).toBe(true);
    expect(a.save.coins).toBe(s.coins + ECONOMY.ads.bonusCoins);
    const b = grantRewardedAd(a.save, 'bonus_coins', 'tok-1', now);
    expect(b).toMatchObject({ granted: false, reason: 'duplicate' });
    expect(b.save.coins).toBe(a.save.coins);
  });

  test('daily limits are enforced and reset the next day', () => {
    let s = defaultSave();
    const limit = ECONOMY.ads.bonusCoinsDailyLimit;
    for (let i = 0; i < limit; i++) {
      const g = grantRewardedAd(s, 'bonus_coins', `t${i}`, now);
      expect(g.granted).toBe(true);
      s = g.save;
    }
    expect(rewardedUsesLeft(s, 'bonus_coins', '2026-10-14')).toBe(0);
    expect(grantRewardedAd(s, 'bonus_coins', 'extra', now)).toMatchObject({ granted: false, reason: 'limit' });
    expect(grantRewardedAd(s, 'bonus_coins', 'tomorrow', new Date('2026-10-15T09:00:00')).granted).toBe(true);
  });

  test('double reward and bonus room grants apply their benefit', () => {
    const s = defaultSave();
    expect(grantRewardedAd(s, 'double_reward', 'd', now, { doubleAmount: 10 }).save.coins).toBe(s.coins + 10);
    expect(grantRewardedAd(s, 'bonus_room', 'b', now, { bonusRoomId: 'b02' }).save.bonusRoomsUnlocked).toContain('b02');
  });
});

describe('interstitial policy', () => {
  const ctx = (completedRoom: number, now = 10 * 60_000) => ({ completedRoom, now, today: '2026-10-14', consentFlowActive: false });
  const ready = () => {
    let s = defaultSave();
    s = { ...s, ads: { ...s.ads, day: '2026-10-14' } };
    for (let i = 0; i < INTERSTITIAL_POLICY.roomsBetween; i++) s = noteRoomForInterstitial(s);
    return s;
  };

  test('never during onboarding', () => {
    expect(shouldShowInterstitial(ready(), ctx(INTERSTITIAL_POLICY.minRoomBeforeFirst - 1))).toBe(false);
    expect(shouldShowInterstitial(ready(), ctx(INTERSTITIAL_POLICY.minRoomBeforeFirst))).toBe(true);
  });

  test('respects rooms-between, interval, rewarded cooldown, consent and daily cap', () => {
    const s = ready();
    const shown = recordInterstitialShown(s, 10 * 60_000, '2026-10-14');
    expect(shouldShowInterstitial(shown, ctx(20, 30 * 60_000))).toBe(false); // rooms counter reset
    let again = shown;
    for (let i = 0; i < INTERSTITIAL_POLICY.roomsBetween; i++) again = noteRoomForInterstitial(again);
    expect(shouldShowInterstitial(again, ctx(20, 10 * 60_000 + 1000))).toBe(false); // too soon
    expect(shouldShowInterstitial(again, ctx(20, 10 * 60_000 + INTERSTITIAL_POLICY.minIntervalMs))).toBe(true);
    const afterReward = { ...s, ads: { ...s.ads, lastRewardedAt: 10 * 60_000 - 1000 } };
    expect(shouldShowInterstitial(afterReward, ctx(20))).toBe(false);
    expect(shouldShowInterstitial(s, { ...ctx(20), consentFlowActive: true })).toBe(false);
    const capped = { ...s, ads: { ...s.ads, interstitialsToday: INTERSTITIAL_POLICY.maxPerDay } };
    expect(shouldShowInterstitial(capped, ctx(20))).toBe(false);
  });
});

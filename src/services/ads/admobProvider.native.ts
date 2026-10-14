// Google AdMob provider using react-native-google-mobile-ads (requires a development or
// production build; the native module is not available in Expo Go).
import { Platform } from 'react-native';
import type { AdUnitIds } from '../../config/ads';
import { log } from '../../utils/log';
import { isExpoGo } from '../../utils/runtime';
import type { AdProvider, PresentationHandlers } from './types';

type Lib = typeof import('react-native-google-mobile-ads');

function loadLib(): Lib | null {
  if (isExpoGo) return null;
  try {
    // Required lazily so a missing native module (Expo Go) degrades to "no ads" instead of crashing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads') as Lib;
  } catch (e) {
    log.warn('ads', 'AdMob native module unavailable', e);
    return null;
  }
}

export function createAdMobProvider(units: AdUnitIds | null): AdProvider | null {
  const lib = loadLib();
  if (!lib) return null;
  const { default: mobileAds, RewardedAd, InterstitialAd, AdEventType, RewardedAdEventType, TestIds, MaxAdContentRating } = lib;
  const ids: AdUnitIds = units ?? { rewarded: TestIds.REWARDED, interstitial: TestIds.INTERSTITIAL };
  const usingTestIds = !units;

  let nonPersonalized = true;
  let rewarded: ReturnType<typeof RewardedAd.createForAdRequest> | null = null;
  let interstitial: ReturnType<typeof InterstitialAd.createForAdRequest> | null = null;
  let rewardedHandlers: PresentationHandlers | null = null;
  let interstitialHandlers: PresentationHandlers | null = null;

  const makeRewarded = () => {
    const ad = RewardedAd.createForAdRequest(ids.rewarded, { requestNonPersonalizedAdsOnly: nonPersonalized });
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => rewardedHandlers?.onEarned?.());
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      const h = rewardedHandlers;
      rewardedHandlers = null;
      h?.onClosed();
    });
    ad.addAdEventListener(AdEventType.ERROR, (err) => {
      const h = rewardedHandlers;
      rewardedHandlers = null;
      if (h) h.onError(String((err as Error)?.message ?? err));
      else log.info('ads', 'rewarded load error', err);
    });
    return ad;
  };

  const makeInterstitial = () => {
    const ad = InterstitialAd.createForAdRequest(ids.interstitial, { requestNonPersonalizedAdsOnly: nonPersonalized });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      const h = interstitialHandlers;
      interstitialHandlers = null;
      h?.onClosed();
    });
    ad.addAdEventListener(AdEventType.ERROR, (err) => {
      const h = interstitialHandlers;
      interstitialHandlers = null;
      if (h) h.onError(String((err as Error)?.message ?? err));
      else log.info('ads', 'interstitial load error', err);
    });
    return ad;
  };

  return {
    name: usingTestIds ? `admob (test units, ${Platform.OS})` : `admob (${Platform.OS})`,
    isSimulation: false,
    async initialize(opts) {
      nonPersonalized = opts.nonPersonalized;
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await mobileAds().initialize();
      rewarded = makeRewarded();
      interstitial = makeInterstitial();
    },
    loadRewarded() {
      rewarded?.load();
    },
    isRewardedReady() {
      return !!rewarded?.loaded;
    },
    showRewarded(h) {
      if (!rewarded) return h.onError('not initialised');
      rewardedHandlers = h;
      rewarded.show().catch((e: unknown) => {
        const cur = rewardedHandlers;
        rewardedHandlers = null;
        cur?.onError(String((e as Error)?.message ?? e));
      });
    },
    loadInterstitial() {
      interstitial?.load();
    },
    isInterstitialReady() {
      return !!interstitial?.loaded;
    },
    showInterstitial(h) {
      if (!interstitial) return h.onError('not initialised');
      interstitialHandlers = h;
      interstitial.show().catch((e: unknown) => {
        const cur = interstitialHandlers;
        interstitialHandlers = null;
        cur?.onError(String((e as Error)?.message ?? e));
      });
    },
  };
}

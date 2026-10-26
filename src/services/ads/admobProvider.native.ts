// Google Mobile Ads provider using react-native-google-mobile-ads (requires a development or
// production build; the native module is not available in Expo Go). Serves AdMob unit ids and
// Google Ad Manager unit paths alike; GAM requests also carry key-values (see gamTargeting).
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { gamTargeting, isGamUnit, type AdUnitIds } from '../../config/ads';
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

export function createAdMobProvider(units: AdUnitIds | null, network: 'admob' | 'gam' = 'admob'): AdProvider | null {
  const lib = loadLib();
  if (!lib) return null;
  const { default: mobileAds, RewardedAd, InterstitialAd, GAMInterstitialAd, AdEventType, RewardedAdEventType, TestIds, MaxAdContentRating } =
    lib;
  const testIds: AdUnitIds =
    network === 'gam'
      ? { rewarded: TestIds.GAM_REWARDED, interstitial: TestIds.GAM_INTERSTITIAL }
      : { rewarded: TestIds.REWARDED, interstitial: TestIds.INTERSTITIAL };
  const ids: AdUnitIds = units ?? testIds;
  const usingTestIds = !units;
  const targeting = gamTargeting(Platform.OS, Constants.expoConfig?.version);
  const requestOptions = (unitId: string) =>
    isGamUnit(unitId)
      ? { requestNonPersonalizedAdsOnly: nonPersonalized, customTargeting: targeting }
      : { requestNonPersonalizedAdsOnly: nonPersonalized };

  let nonPersonalized = true;
  let rewarded: ReturnType<typeof RewardedAd.createForAdRequest> | null = null;
  let interstitial: ReturnType<typeof InterstitialAd.createForAdRequest> | null = null;
  let rewardedHandlers: PresentationHandlers | null = null;
  let interstitialHandlers: PresentationHandlers | null = null;

  const makeRewarded = () => {
    const ad = RewardedAd.createForAdRequest(ids.rewarded, requestOptions(ids.rewarded));
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
    const Interstitial = isGamUnit(ids.interstitial) ? GAMInterstitialAd : InterstitialAd;
    const ad = Interstitial.createForAdRequest(ids.interstitial, requestOptions(ids.interstitial));
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
    name: `${isGamUnit(ids.rewarded) ? 'gam' : 'admob'} (${usingTestIds ? 'test units, ' : ''}${Platform.OS})`,
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

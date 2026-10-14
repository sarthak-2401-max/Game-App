// Chooses the ad provider for this build:
//   - mode "admob" (default): AdMob with configured unit IDs, or Google test units when none are set.
//   - mode "mock": the labelled development simulator (never allowed in production builds).
//   - mode "off": no ads; every placement reports "unavailable" and the game carries on.
// Expo Go has no AdMob native module, so development falls back to the simulator there.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AdUnitIds } from '../../config/ads';
import { log } from '../../utils/log';
import { createAdMobProvider } from './admobProvider';
import { mockProvider } from './mockProvider';
import type { AdProvider } from './types';

interface AdsExtra {
  mode?: 'admob' | 'mock' | 'off';
  iosRewarded?: string;
  iosInterstitial?: string;
  androidRewarded?: string;
  androidInterstitial?: string;
  /** Allow Google's test units in a release build (internal preview builds only). */
  allowTestUnits?: boolean;
}

export function readAdsExtra(): AdsExtra {
  return ((Constants.expoConfig?.extra as { ads?: AdsExtra } | undefined)?.ads ?? {}) as AdsExtra;
}

function unitIds(extra: AdsExtra): AdUnitIds | null {
  const rewarded = Platform.OS === 'ios' ? extra.iosRewarded : extra.androidRewarded;
  const interstitial = Platform.OS === 'ios' ? extra.iosInterstitial : extra.androidInterstitial;
  return rewarded && interstitial ? { rewarded, interstitial } : null;
}

export function createAdProvider(): AdProvider | null {
  const extra = readAdsExtra();
  const mode = extra.mode ?? 'admob';
  if (mode === 'off') return null;
  if (mode === 'mock') return __DEV__ ? mockProvider : null;
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const units = unitIds(extra);
  if (!__DEV__ && !units && !extra.allowTestUnits) {
    // A release build without real unit IDs shows no ads rather than Google test ads.
    log.warn('ads', 'No AdMob unit IDs configured for this release build; ads are disabled');
    return null;
  }
  const real = Platform.OS === 'web' || isExpoGo ? null : createAdMobProvider(units);
  if (real) return real;
  if (__DEV__) {
    log.info('ads', 'Using the development ad SIMULATOR (no real ads in this environment)');
    return mockProvider;
  }
  return null;
}

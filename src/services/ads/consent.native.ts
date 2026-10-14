// Consent flow for native builds:
//  1. Google UMP (User Messaging Platform): request consent info and show the form when required
//     (EEA/UK/Switzerland GDPR, US state privacy laws as configured in AdMob > Privacy & messaging).
//  2. iOS App Tracking Transparency, only after UMP allows ad requests.
// Ads are not requested until this completes; personalised ads require both UMP consent
// (read by the SDK from the IAB TCF string) and, on iOS, ATT authorisation.
import { Platform } from 'react-native';
import { log } from '../../utils/log';
import type { ConsentOutcome } from './consentTypes';

type Lib = typeof import('react-native-google-mobile-ads');

function lib(): Lib | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads') as Lib;
  } catch {
    return null;
  }
}

async function requestAtt(): Promise<ConsentOutcome['attStatus']> {
  if (Platform.OS !== 'ios') return 'unavailable';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const att = require('expo-tracking-transparency') as typeof import('expo-tracking-transparency');
    if (!att.isAvailable()) return 'unavailable';
    const current = await att.getTrackingPermissionsAsync();
    const res = current.status === 'undetermined' ? await att.requestTrackingPermissionsAsync() : current;
    return res.status === 'granted' ? 'granted' : res.status === 'denied' ? 'denied' : 'undetermined';
  } catch (e) {
    log.warn('consent', 'ATT unavailable', e);
    return 'unavailable';
  }
}

export async function gatherConsent(): Promise<ConsentOutcome> {
  const l = lib();
  if (!l) return { canRequestAds: false, nonPersonalized: true, attStatus: 'unavailable', privacyOptionsRequired: false };
  const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } = l;
  try {
    await AdsConsent.requestInfoUpdate();
    const info = await AdsConsent.loadAndShowConsentFormIfRequired();
    const privacyOptionsRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    if (!info.canRequestAds) {
      return { canRequestAds: false, nonPersonalized: true, attStatus: 'unavailable', privacyOptionsRequired };
    }
    const attStatus = await requestAtt();
    const trackingBlocked = Platform.OS === 'ios' && attStatus !== 'granted';
    return { canRequestAds: true, nonPersonalized: trackingBlocked, attStatus, privacyOptionsRequired };
  } catch (e) {
    log.warn('consent', 'UMP flow failed; using previous consent state if any', e);
    try {
      const info = await AdsConsent.getConsentInfo();
      return {
        canRequestAds: info.canRequestAds,
        nonPersonalized: true,
        attStatus: 'unavailable',
        privacyOptionsRequired: info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      };
    } catch {
      return { canRequestAds: false, nonPersonalized: true, attStatus: 'unavailable', privacyOptionsRequired: false };
    }
  }
}

/** Re-opens the UMP privacy options form from Settings. */
export async function showPrivacyOptions(): Promise<boolean> {
  const l = lib();
  if (!l) return false;
  try {
    await l.AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch (e) {
    log.warn('consent', 'privacy options form failed', e);
    return false;
  }
}

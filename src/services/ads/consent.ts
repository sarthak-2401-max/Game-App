// Web / test consent: no ad SDK, nothing to gather.
import type { ConsentOutcome } from './consentTypes';

export async function gatherConsent(): Promise<ConsentOutcome> {
  return { canRequestAds: true, nonPersonalized: true, attStatus: 'unavailable', privacyOptionsRequired: false };
}

export async function showPrivacyOptions(): Promise<boolean> {
  return false;
}

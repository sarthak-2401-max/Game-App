export interface ConsentOutcome {
  /** False when the user's region requires consent that has not been given. */
  canRequestAds: boolean;
  /** Request only non-personalised ads (no consent for personalisation or tracking denied). */
  nonPersonalized: boolean;
  attStatus: 'granted' | 'denied' | 'undetermined' | 'restricted' | 'unavailable';
  /** Whether Settings must offer the "Ad privacy choices" entry point (GDPR/US state laws). */
  privacyOptionsRequired: boolean;
}

// Advertising configuration. Production ad unit IDs are read from app config (`extra.ads` in
// app.config.ts, sourced from EAS environment variables). When they are missing, development
// builds use Google's public test units, and release builds show no ads at all (unless
// ORL_ADMOB_ALLOW_TEST_UNITS=1 is set for an internal preview build).

export type AdPlacement =
  | 'revive'
  | 'hint'
  | 'double_reward'
  | 'bonus_coins'
  | 'bonus_room'
  | 'powerup'
  | 'interstitial_transition';

export type RewardedPlacement = Exclude<AdPlacement, 'interstitial_transition'>;

export const INTERSTITIAL_POLICY = {
  enabled: true,
  /** Never before this campaign room has been completed (protects onboarding). */
  minRoomBeforeFirst: 8,
  /** Completed rooms between interstitials. */
  roomsBetween: 4,
  /** Minimum real time between interstitials. */
  minIntervalMs: 4 * 60 * 1000,
  /** Quiet period after any rewarded ad. */
  cooldownAfterRewardedMs: 2 * 60 * 1000,
  /** Hard cap per local day. */
  maxPerDay: 8,
} as const;

export interface AdUnitIds {
  rewarded: string;
  interstitial: string;
}

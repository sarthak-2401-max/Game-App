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
  /** Optional: null disables interstitials and keeps rewarded ads. */
  interstitial: string | null;
}

/**
 * Google Ad Manager unit paths look like `/21234567890/one_room_left/rewarded`; AdMob unit ids look
 * like `ca-app-pub-1234567890123456/1234567890`. Both are served by the same Google Mobile Ads SDK.
 */
export function isGamUnit(unitId: string): boolean {
  return /^\/\d+(\/[\w.\-]+)+$/.test(unitId);
}

export function isAdMobUnit(unitId: string): boolean {
  return /^ca-app-pub-\d{16}\/\d{10}$/.test(unitId);
}

/** Static Ad Manager key-values sent with every request (ignored by AdMob). Keep them non-identifying. */
export function gamTargeting(platform: string, appVersion: string | undefined): Record<string, string> {
  return { app: 'one_room_left', plat: platform, ver: appVersion ?? 'unknown' };
}

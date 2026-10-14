// Web / test fallback: AdMob has no web SDK in this app.
import type { AdUnitIds } from '../../config/ads';
import type { AdProvider } from './types';

export function createAdMobProvider(_units: AdUnitIds | null): AdProvider | null {
  return null;
}

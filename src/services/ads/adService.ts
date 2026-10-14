// Advertising orchestration. Screens call `presentRewarded(placement)` and receive exactly one
// result per presentation. A reward is reported as 'earned' only if the SDK's earned-reward
// callback fired; opening or closing an ad alone never counts.

import type { RewardedPlacement } from '../../config/ads';
import { log } from '../../utils/log';
import { randomToken } from '../../utils/dates';
import { analytics } from '../analytics/analytics';
import type { AdProvider, RewardedResult } from './types';

/** If an SDK never reports close/error, stop waiting so the UI cannot hang. */
const PRESENTATION_TIMEOUT_MS = 120_000;

export class AdService {
  private provider: AdProvider | null = null;
  private initialized = false;
  private showing = false;
  private listeners = new Set<() => void>();

  setProvider(p: AdProvider | null) {
    this.provider = p;
    this.initialized = false;
    this.notify();
  }

  get providerName() {
    return this.provider?.name ?? 'none';
  }

  /** False when this build has no ad source (web, ads off, or a release build without unit IDs). */
  get hasProvider() {
    return !!this.provider;
  }

  get isSimulation() {
    return this.provider?.isSimulation ?? false;
  }

  get isShowing() {
    return this.showing;
  }

  async initialize(opts: { nonPersonalized: boolean }) {
    if (!this.provider || this.initialized) return;
    try {
      await this.provider.initialize(opts);
      this.initialized = true;
      this.provider.loadRewarded();
      this.provider.loadInterstitial();
    } catch (e) {
      log.warn('ads', 'initialize failed; continuing without ads', e);
    }
    this.notify();
  }

  isRewardedReady(): boolean {
    try {
      return !!this.provider && this.initialized && !this.showing && this.provider.isRewardedReady();
    } catch {
      return false;
    }
  }

  /** Load (or reload) a rewarded ad; safe to call repeatedly. */
  loadRewarded() {
    if (!this.provider || !this.initialized) return;
    try {
      this.provider.loadRewarded();
    } catch (e) {
      log.warn('ads', 'loadRewarded failed', e);
    }
  }

  presentRewarded(placement: RewardedPlacement): Promise<RewardedResult> {
    const token = randomToken();
    if (!this.isRewardedReady() || !this.provider) {
      analytics.track('rewarded_ad_failed', { placement, reason: 'unavailable' });
      this.loadRewarded();
      return Promise.resolve({ outcome: 'unavailable', placement, token });
    }
    this.showing = true;
    this.notify();
    analytics.track('rewarded_ad_started', { placement });
    const provider = this.provider;

    return new Promise<RewardedResult>((resolve) => {
      let earned = false;
      let settled = false;
      const finish = (r: Omit<RewardedResult, 'placement' | 'token'>) => {
        if (settled) return; // duplicate close/error callbacks are ignored
        settled = true;
        clearTimeout(timer);
        this.showing = false;
        this.notify();
        analytics.track(r.outcome === 'earned' ? 'rewarded_ad_completed' : 'rewarded_ad_failed', {
          placement,
          reason: r.outcome,
        });
        resolve({ ...r, placement, token });
        // Preload the next one after the presentation is fully over.
        setTimeout(() => this.loadRewarded(), 0);
      };
      const timer = setTimeout(() => finish({ outcome: earned ? 'earned' : 'failed', error: 'timeout' }), PRESENTATION_TIMEOUT_MS);
      try {
        provider.showRewarded({
          onEarned: () => {
            earned = true; // repeated earned callbacks are idempotent
          },
          onClosed: () => finish({ outcome: earned ? 'earned' : 'dismissed' }),
          onError: (message) => finish({ outcome: earned ? 'earned' : 'failed', error: message }),
        });
      } catch (e) {
        finish({ outcome: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  isInterstitialReady(): boolean {
    try {
      return !!this.provider && this.initialized && !this.showing && this.provider.isInterstitialReady();
    } catch {
      return false;
    }
  }

  /** Shows an interstitial if one is ready. Resolves when it is closed (or immediately). */
  presentInterstitial(): Promise<boolean> {
    if (!this.isInterstitialReady() || !this.provider) {
      this.provider && this.initialized && this.provider.loadInterstitial();
      return Promise.resolve(false);
    }
    const provider = this.provider;
    this.showing = true;
    this.notify();
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (shown: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.showing = false;
        this.notify();
        resolve(shown);
        setTimeout(() => provider.loadInterstitial(), 0);
      };
      const timer = setTimeout(() => finish(false), PRESENTATION_TIMEOUT_MS);
      try {
        provider.showInterstitial({ onClosed: () => finish(true), onError: () => finish(false) });
      } catch {
        finish(false);
      }
    });
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const adService = new AdService();

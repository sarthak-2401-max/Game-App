// DEVELOPMENT SIMULATION ONLY. This provider does not contact any ad network and earns no
// revenue. It renders a clearly labelled stand-in so reward flows can be exercised in Expo Go,
// on web and in tests. It is never selected in production builds (see providerFactory).

import type { AdProvider, PresentationHandlers } from './types';

export type MockAdRequest = {
  kind: 'rewarded' | 'interstitial';
  /** The user (or a test) chooses how the simulated ad ends. */
  complete: () => void;
  dismiss: () => void;
  fail: () => void;
};

type Host = (req: MockAdRequest | null) => void;

export class MockAdProvider implements AdProvider {
  readonly name = 'mock (simulation)';
  readonly isSimulation = true;
  private host: Host | null = null;
  private rewardedLoaded = false;
  private interstitialLoaded = false;

  constructor(private opts: { fillRate?: number; loadDelayMs?: number } = {}) {}

  /** The MockAdHost component (or a test) registers here to render/drive presentations. */
  attachHost(h: Host | null) {
    this.host = h;
  }

  async initialize() {}

  private simulateLoad(set: (v: boolean) => void) {
    const fill = this.opts.fillRate ?? 1;
    const delay = this.opts.loadDelayMs ?? 300;
    const done = () => set(Math.random() < fill);
    if (delay <= 0) done();
    else setTimeout(done, delay);
  }

  loadRewarded() {
    if (!this.rewardedLoaded) this.simulateLoad((v) => (this.rewardedLoaded = v));
  }

  isRewardedReady() {
    return this.rewardedLoaded && !!this.host;
  }

  showRewarded(h: PresentationHandlers) {
    this.rewardedLoaded = false;
    this.present('rewarded', h);
  }

  loadInterstitial() {
    if (!this.interstitialLoaded) this.simulateLoad((v) => (this.interstitialLoaded = v));
  }

  isInterstitialReady() {
    return this.interstitialLoaded && !!this.host;
  }

  showInterstitial(h: PresentationHandlers) {
    this.interstitialLoaded = false;
    this.present('interstitial', h);
  }

  private present(kind: MockAdRequest['kind'], h: PresentationHandlers) {
    if (!this.host) {
      h.onError('no mock host');
      return;
    }
    const host = this.host;
    host({
      kind,
      complete: () => {
        host(null);
        if (kind === 'rewarded') h.onEarned?.();
        h.onClosed();
      },
      dismiss: () => {
        host(null);
        h.onClosed();
      },
      fail: () => {
        host(null);
        h.onError('simulated failure');
      },
    });
  }
}

export const mockProvider = new MockAdProvider();

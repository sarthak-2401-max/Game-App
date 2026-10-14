import type { RewardedPlacement } from '../../config/ads';

export type RewardedOutcome = 'earned' | 'dismissed' | 'failed' | 'unavailable';

export interface RewardedResult {
  outcome: RewardedOutcome;
  placement: RewardedPlacement;
  /** Unique per presentation; the progression layer refuses to grant the same token twice. */
  token: string;
  error?: string;
}

/** Callbacks a provider fires during one fullscreen presentation. */
export interface PresentationHandlers {
  onEarned?: () => void;
  onClosed: () => void;
  onError: (message: string) => void;
}

/**
 * A source of fullscreen ads. Providers only report SDK events; reward integrity
 * (single resolution, earned-before-grant, duplicate protection) lives in AdService.
 */
export interface AdProvider {
  readonly name: string;
  /** True for the development simulator. Never true for a production SDK. */
  readonly isSimulation: boolean;
  initialize(opts: { nonPersonalized: boolean }): Promise<void>;
  loadRewarded(): void;
  isRewardedReady(): boolean;
  showRewarded(h: PresentationHandlers): void;
  loadInterstitial(): void;
  isInterstitialReady(): boolean;
  showInterstitial(h: PresentationHandlers): void;
}

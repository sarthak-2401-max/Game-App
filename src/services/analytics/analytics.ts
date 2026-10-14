// Analytics abstraction. The initial release ships with NO third-party analytics SDK:
// events go to the development console in dev builds and nowhere in production until a
// provider is registered with `analytics.setProvider` (see docs/ANALYTICS.md). Properties are
// non-identifying by design (room ids, counts, placements) — never names, emails or device ids.

export type AnalyticsEvent =
  | 'app_open'
  | 'session_end'
  | 'tutorial_started'
  | 'tutorial_completed'
  | 'level_started'
  | 'level_completed'
  | 'level_failed'
  | 'level_restarted'
  | 'undo_used'
  | 'hint_used'
  | 'rewarded_ad_offered'
  | 'rewarded_ad_started'
  | 'rewarded_ad_completed'
  | 'rewarded_ad_failed'
  | 'interstitial_shown'
  | 'reward_granted'
  | 'cosmetic_unlocked'
  | 'achievement_unlocked'
  | 'daily_challenge_started'
  | 'daily_challenge_completed'
  | 'save_recovered'
  | 'progress_reset';

export type EventProps = Record<string, string | number | boolean | undefined>;

export interface AnalyticsProvider {
  track(event: AnalyticsEvent, props: EventProps): void;
  flush?(): Promise<void>;
}

const devConsole: AnalyticsProvider = {
  track(event, props) {
     
    console.log(`[analytics] ${event}`, props);
  },
};

class Analytics {
  private provider: AnalyticsProvider | null =
    typeof __DEV__ !== 'undefined' && __DEV__ && typeof process !== 'undefined' && !process.env?.JEST_WORKER_ID ? devConsole : null;
  private sessionStart = Date.now();
  private roomsThisSession = 0;
  /** Recent events kept in memory (used by tests and handy when debugging). */
  readonly recent: { event: AnalyticsEvent; props: EventProps; at: number }[] = [];

  setProvider(p: AnalyticsProvider | null) {
    this.provider = p;
  }

  track(event: AnalyticsEvent, props: EventProps = {}) {
    if (event === 'level_completed') this.roomsThisSession++;
    this.recent.push({ event, props, at: Date.now() });
    if (this.recent.length > 200) this.recent.shift();
    try {
      this.provider?.track(event, props);
    } catch {
      // Analytics must never break gameplay.
    }
  }

  startSession() {
    this.sessionStart = Date.now();
    this.roomsThisSession = 0;
  }

  endSession() {
    this.track('session_end', {
      duration_s: Math.round((Date.now() - this.sessionStart) / 1000),
      rooms_completed: this.roomsThisSession,
    });
  }
}

export const analytics = new Analytics();

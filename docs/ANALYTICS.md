# Analytics

No third-party analytics SDK ships in this version. `src/services/analytics/analytics.ts` is a typed abstraction: in development builds events print to the console; in release builds they go nowhere until you register a provider.

## Events

| Event | Key properties |
|---|---|
| `app_open` | sessions, rooms_completed |
| `session_end` | duration_s, rooms_completed |
| `tutorial_started`, `tutorial_completed` | — |
| `level_started`, `level_completed`, `level_failed` | room_id, chapter, kind, attempt, moves, cause (failed), used_undo, hints, first_clear |
| `level_restarted`, `undo_used`, `hint_used` | room_id, kind/result |
| `rewarded_ad_offered`, `rewarded_ad_started`, `rewarded_ad_completed`, `rewarded_ad_failed` | placement, reason |
| `reward_granted` | placement, source |
| `interstitial_shown` | — |
| `cosmetic_unlocked` | id, slot, price |
| `achievement_unlocked` | id |
| `daily_challenge_started`, `daily_challenge_completed` | room_id, claimed, moves |
| `save_recovered`, `progress_reset` | outcome |

Properties are deliberately non-identifying: room ids, counts, placements. Never add names, emails or device identifiers.

## Adding a provider

```ts
import { analytics } from './src/services/analytics/analytics';
analytics.setProvider({
  track(event, props) { /* forward to your SDK */ },
});
```

Register it in `App.tsx` before `init()`. If the SDK collects identifiers, gate it on the consent outcome, then update docs/PRIVACY.md, the in-app Privacy screen, the hosted policy and both store privacy forms.

Useful first dashboards: funnel of `level_completed` by room (find difficulty spikes), `level_failed` cause by room, rewarded offer → completed rate by placement, day-1/day-7 return via `app_open`.

# Ads

The game uses **Google AdMob** through `react-native-google-mobile-ads` (v17, New Architecture). Every rewarded ad is optional, and every room can be finished without one.

## What is real and what is not

| Piece | State |
|---|---|
| AdMob SDK integration (`src/services/ads/admobProvider.native.ts`) | Written against the v17 API; compiles. **Not yet run on a device.** |
| UMP consent + ATT (`consent.native.ts`) | Written; **not yet run on a device**. |
| Reward integrity (`adService.ts`, `grantRewardedAd`) | Covered by automated tests with a scripted provider and the simulator. |
| Ad simulator (`mockProvider.ts`, `MockAdHost.tsx`) | Development only, labelled "SIMULATED AD · DEVELOPMENT ONLY". Exercised in a browser development build. |
| Your AdMob account, app ids, unit ids | **You must create these.** Nothing account-specific is in the repo. |

## Placements

| Placement | Offered when | Reward | Daily cap |
|---|---|---|---|
| Revive | After a failure (not in rooms 1–3) | Rewind the fatal move, +5 moves, or +15 s; once per attempt | 20 |
| Hint | Hint sheet (not in rooms 1–3) | Next 3 moves of a working solution | 15 |
| Double reward | Completion sheet, first clear only | Base room reward again | 10 |
| Free coins | Rewards → Coins | 15 coins | 5 |
| Bonus room | Bonus Vault | Unlock one bonus room | 3 |
| Interstitial | Only on "Next room" after a completed campaign room | none | 8 |

All values live in `src/config/economy.ts` and `src/config/ads.ts`. Offers are hidden entirely when the build has no ad source.

## Reward integrity

1. The player is told the reward before the ad and can decline.
2. `AdService.presentRewarded` resolves **once**. It returns `earned` only if the SDK's earned-reward callback fired before the ad closed; closing early is `dismissed`, errors are `failed`, nothing loaded is `unavailable`. Duplicate callbacks are ignored, and a 120 s timeout prevents a stuck promise.
3. Each presentation carries a unique token. `grantRewardedAd` refuses a token it has seen (the last 100 are persisted in the save) and enforces daily caps, so a duplicate callback or a race cannot double-pay.
4. The caller applies the gameplay effect only after the grant succeeds.

Rewards are granted client-side. For coin rewards in an offline single-player game this is the usual trade-off; if the economy ever feeds anything competitive or purchasable, add AdMob server-side verification (SSV) first.

## Interstitial policy

Never during gameplay, never in onboarding. Shown only after a completed campaign room, from room 8, at least 4 completed rooms apart, at least 4 minutes apart, not within 2 minutes of a rewarded ad, not while the consent flow is running, and at most 8 a day. Covered by `__tests__/ads.test.ts`.

## Setting up AdMob

1. Create an AdMob account and add two apps (iOS, Android). Use the final bundle id / package name.
2. In each app create one **Rewarded** and one **Interstitial** ad unit.
3. Set the eight `ORL_ADMOB_*` variables (see BUILD.md) for the production environment.
4. In AdMob → Privacy & messaging, create a **GDPR** message (and a US state regulations message if you serve those regions) and an **IDFA explainer** for iOS. The in-app UMP flow shows whatever you publish there.
5. Host an `app-ads.txt` on the developer website you list in the stores.
6. Register your test devices in AdMob before testing release builds with real units. Never tap your own live ads.

## Consent timing

New players go straight into room 1. The consent flow (UMP, then ATT on iOS) runs after room 3 is completed, or on launch for returning players, and always before any ad is requested. Settings → Ad privacy choices re-opens the UMP privacy options form.

## Testing checklist (device)

- Development build: rewarded ad plays, closing early grants nothing, finishing grants once.
- Airplane mode: offers say no ad is available, nothing is granted, the game continues.
- EEA (use UMP debug geography): the consent form appears after room 3; declining still lets you play.
- iOS: the ATT prompt appears after the UMP form; denying keeps ads non-personalised.
- Interstitial: complete rooms 8–12 and confirm the spacing rules.

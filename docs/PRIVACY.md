# Privacy and consent

This document describes what the code does today. It is not legal advice; have the final policy reviewed for the markets you launch in.

## Data inventory

| Data | Where | Shared with | Purpose |
|---|---|---|---|
| Progress, coins, cosmetics, achievements, settings, streak, ad counters | On device (AsyncStorage) | Nobody | Gameplay |
| Consent choices | On device (UMP SDK + save) | Google, as part of ad requests | Ad consent |
| Advertising identifier (IDFA/AAID), IP address, device info | Collected by the Google Mobile Ads SDK | Google AdMob and its ad partners | Advertising, frequency capping, fraud prevention, measurement |
| Gameplay analytics events | Development console only | Nobody (no analytics SDK ships) | Debugging |

The game has no account, no backend, no crash reporter and no third-party analytics. If you add any of those, update this file, the in-app Privacy screen, the hosted policy and the store forms.

## Consent flow

1. First launch: no ads are requested and no consent UI appears while the player learns the basics.
2. After room 3 (or on launch for returning players), `gatherConsent()` runs:
   - UMP `requestInfoUpdate` → `loadAndShowConsentFormIfRequired` (EEA/UK/Switzerland and any US-state messages you configure in AdMob).
   - If ads may be requested, iOS shows the App Tracking Transparency prompt (`NSUserTrackingUsageDescription` is set in `app.config.ts`).
   - If tracking is denied or consent limits personalisation, ads are requested as **non-personalised**.
3. The Mobile Ads SDK is initialised only after this flow. Ad content is limited to rating PG.
4. Settings → Ad privacy choices re-opens the UMP privacy options form at any time.

## Children

The game is designed for a general audience and is not directed at children. If you choose a children's or "mixed audience" category in either store, you must change the ad configuration (`tagForChildDirectedTreatment`, Families Policy certified SDK settings) and review this whole document.

## Store privacy forms (guidance)

**Apple App Privacy** (with AdMob as configured): Data used to track you: Identifiers (Device ID), Usage Data (Advertising Data). Data linked or not linked to you per Google's current AdMob disclosure guidance; also declare Diagnostics if you add crash reporting. Include Google's privacy manifest (bundled by the SDK).

**Google Play Data safety**: Device or other IDs (advertising), App interactions and diagnostics as collected by the Mobile Ads SDK; data is encrypted in transit; users cannot request deletion of on-device game data through you because you hold none (uninstalling deletes it). Check Google's current "Mobile Ads SDK data disclosure" page when filling the form.

## Privacy policy template

Host this (completed) at a public URL, then set `privacyPolicyUrl` and `supportEmail` in `src/config/app.ts` and enter the URL in both stores. Replace every `[BRACKETED]` item.

---

**Privacy Policy for One Room Left**
Last updated: 14 October 2026

Sarthak__10 ("we") publishes the mobile game One Room Left. Contact: sarthaksrivastava2413@gmail.com.

**What the game stores.** Your progress, settings and in-game currency are stored only on your device. We do not operate servers for the game and do not receive this data. Uninstalling the game deletes it.

**Advertising.** The game shows ads provided by Google AdMob. Google may collect your device's advertising identifier, IP address and information about your device and ad interactions to show, measure and limit ads and to prevent fraud. Where required by law we ask for your consent first, and on iOS we ask whether apps may track you. You can change your choice at any time in the game under Settings → Ad privacy choices, and in your device's privacy settings. How Google uses data: https://policies.google.com/technologies/partner-sites

**Rewarded ads** are optional. You receive the in-game reward only if the ad completes.

**Analytics.** [The game does not use third-party analytics.] / [Describe provider, data and purpose.]

**Children.** The game is not directed at children under [13 / the age required in your jurisdiction] and we do not knowingly collect their personal information.

**Your rights.** Depending on where you live you may have rights to access, delete or object to processing of personal data. Because we do not hold your game data, contact Google for advertising data, or reach us at sarthaksrivastava2413@gmail.com.

**Changes.** We will post updates on this page.

---

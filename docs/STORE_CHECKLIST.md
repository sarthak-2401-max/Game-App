# Store release checklist

## Before the first build

- [ ] Choose final bundle id / package name and set `ORL_IOS_BUNDLE_ID`, `ORL_ANDROID_PACKAGE`
- [x] `eas init` (project id a9ed4e34-a80e-4cd0-b66b-ed77b486890d is in `app.config.ts`)
- [ ] Create AdMob apps and units; set all `ORL_ADMOB_*` variables for production
- [ ] Publish UMP GDPR (and US states) messages and the iOS IDFA explainer in AdMob
- [ ] Host the privacy policy (template in PRIVACY.md); set `privacyPolicyUrl` and `supportEmail`
- [ ] Host `app-ads.txt` on your developer site
- [ ] Add a LICENSE if the source will be public

## Device QA (development and preview builds)

- [ ] Fresh install → room 1 within seconds, no consent/ads before room 3 is done
- [ ] Consent form (EEA debug geography) and ATT prompt order; decline path still plays
- [ ] Rewarded: finish grants once; close early grants nothing; airplane mode handled
- [ ] Interstitial spacing (rooms 8+); none mid-room or during consent
- [ ] Countdown pauses on pause, hint sheet and app background; resumes correctly
- [ ] Android back button: closes sheets, pauses gameplay, navigates back, exits from Home
- [ ] Swipe and tap input on a small phone (e.g. iPhone SE size) and a large one; safe areas and notch
- [ ] Sound/music toggles, silent switch, phone call interruption
- [ ] Haptics on and off
- [ ] Reduce motion
- [ ] VoiceOver / TalkBack: menus, room tiles, buttons announced sensibly
- [ ] Kill the app mid-room and relaunch: progress intact; corrupt-save recovery notice works
- [ ] Settings → Reset progress (double confirmation) and version display
- [ ] Play through at least chapters 1–2 by hand and spot-check later chapters for difficulty
- [ ] Release build without unit ids shows no ads (sanity check of the safety net)

## App Store (iOS)

- [ ] App Store Connect record, SKU, primary category Games → Puzzle
- [ ] App Privacy questionnaire (see PRIVACY.md); tracking declared because of ATT
- [ ] Age rating questionnaire (expected 4+/9+ depending on ad content settings)
- [ ] Screenshots: 6.9" iPhone (`store-assets/ios-6.9in`). iPad is off (`supportsTablet: false`), so no iPad screenshots are needed
- [ ] Description, keywords, support URL, marketing URL, privacy policy URL
- [ ] Export compliance: `usesNonExemptEncryption: false` is set
- [ ] `eas build --profile production --platform ios` → `eas submit` → TestFlight → review

## Google Play

- [ ] Play Console app, store listing, category Puzzle
- [ ] Data safety form; Ads declaration = yes; target audience (not children)
- [ ] Content rating (IARC) questionnaire
- [ ] Feature graphic 1024×500, phone screenshots, icon 512×512
- [ ] Closed testing track (required for new personal developer accounts before production)
- [ ] `eas build --profile production --platform android` (AAB) → `eas submit`
- [ ] Pre-launch report reviewed

## After launch

- [ ] Watch AdMob fill and policy centre; keep test devices registered
- [ ] Add crash reporting (and disclose it) if needed

# Known limitations

## Not yet verified (needs a device or an account)

- **No native build has been made.** Everything was built and tested in a Linux container: TypeScript, lint, Jest, a static web export and a headless-browser run. No iOS or Android binary has been compiled or installed.
- **AdMob, UMP consent and ATT have not run.** The integration compiles against `react-native-google-mobile-ads` 17.2 and follows its documented API, but no real ad has been requested, shown or rewarded. No AdMob account, app ids or ad units exist yet.
- **Audio and haptics** were not heard or felt on a phone. On the web build, audio waits for the first tap or key press (browser autoplay rules).
- **Touch input:** swipe and tap-to-move were not automated; the browser runs used the keyboard. Gesture handling needs a pass on real phones, including small screens and notched devices.
- **Screen readers:** accessibility labels and roles are set on controls and board, but VoiceOver and TalkBack were not tested.
- **Performance** on low-end Android devices is unmeasured. The largest rooms render about 100 SVG tiles plus animated layers.
- `expo-doctor` passes 19 of 21 checks; the two that fail need network access to Expo's servers that this environment blocks (config schema download and React Native Directory lookup).

## By design / trade-offs

- **Rewards are granted on the client** after the SDK's earned callback, with token de-duplication and daily caps. There is no server-side verification (SSV). Fine for an offline single-player economy; add SSV before rewards gain real-world value.
- **Daily challenge clock:** moving the device clock backwards is detected and blocked; moving it forwards lets a player claim upcoming dailies early. Fixing that needs a trusted time source.
- **Daily pool** is 12 rooms dealt in shuffled cycles, so a room returns roughly every 12 days.
- **Hints** follow the stored shortest solution while you are on it; off that path they search with a 40,000-state budget and can answer "no hint available right now" in the largest late rooms. They correctly report when a state is no longer winnable.
- **No undo after death.** A failure can be undone only through the optional revive (rewind) or a restart/checkpoint.
- **Navigation** uses a small in-app stack instead of Expo Router (no deep links needed).
- **English only.** Strings are inline in components; localisation would need extraction.
- **Local saves only.** No cloud sync; uninstalling deletes progress.
- **Difficulty** is tuned with solver metrics (shortest path, dead-end states, critical turns), not with human playtests. Expect to rebalance a few rooms after real players try them.
- **Music** is a simple synthesised loop meant as a placeholder for a composed track.

## Placeholders you must replace

- `com.example.oneroomleft` bundle id / package (env vars, BUILD.md)
- `privacyPolicyUrl` and `supportEmail` in `src/config/app.ts`
- AdMob app ids and unit ids (env vars, ADS.md)

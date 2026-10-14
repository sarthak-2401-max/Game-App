# Accounts and information you need to supply

Nothing below has been created for you. Placeholders in the code are marked and listed here.

| Item | Needed for | Where it goes |
|---|---|---|
| Publisher / legal entity name | Store listings, privacy policy, AdMob payments | Store consoles, policy |
| Apple Developer Program membership | iOS builds and App Store | `eas build`, App Store Connect |
| Google Play Console account (one-time fee; new personal accounts must run a closed test before production) | Android release | Play Console |
| Expo account | EAS Build/Submit | `eas login`, `EAS_PROJECT_ID` |
| Final bundle id / package name (reverse domain you control) | Both stores, AdMob | `ORL_IOS_BUNDLE_ID`, `ORL_ANDROID_PACKAGE` |
| AdMob account, 2 apps, 4 ad units, consent messages | Ads | `ORL_ADMOB_*` env vars, AdMob Privacy & messaging |
| Developer website with `app-ads.txt` | AdMob verification | Your domain |
| Hosted privacy policy URL | Both stores, AdMob, in-app link | `src/config/app.ts` → `privacyPolicyUrl` |
| Support email | Store listings, Settings screen | `src/config/app.ts` → `supportEmail` |
| Store listing text, screenshots, feature graphic, age-rating questionnaire | Store submission | Store consoles (see STORE_CHECKLIST.md) |
| Tax and payment details | AdMob payouts, paid apps | AdMob, App Store Connect, Play Console |
| License choice for the source | Publishing the code | Add a LICENSE file |

Never commit signing keys, keystores, `.p8`/`.p12` files or service-account JSON. Store them in EAS credentials or a secrets manager.

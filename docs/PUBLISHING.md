# Publishing guide

The exact path from this repository to both stores. Steps marked **(you)** need your accounts or decisions. Everything else is already set up in the repo.

## 1. Accounts (you)

| Account | Cost | Notes |
|---|---|---|
| Apple Developer Program, individual | 99 USD/year | Your legal name appears as the seller. Identity verification can take a day or two. |
| Google Play Console, personal | 25 USD once | New personal accounts must run a **closed test with at least 12 testers for 14 days** before production access. Start this early. |
| Expo (expo.dev) | free tier is enough | Builds and submissions run on EAS. |
| Google AdMob | free | Needs the published store listing to fully verify the app; ads work in limited mode before that. |

## 2. Repository settings (you)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** The Pages workflow then publishes `site/`, and the privacy policy is at `https://sarthak-2401-max.github.io/Game-App/privacy.html`.
2. Fill in `[DEVELOPER NAME]`, `[CONTACT EMAIL]` and `[DATE]` in `site/privacy.html` and `site/index.html`.
3. Set `privacyPolicyUrl` and `supportEmail` in `src/config/app.ts`.
4. **Settings → Secrets and variables → Actions → New secret `EXPO_TOKEN`** (expo.dev → Account settings → Access tokens).

## 3. Expo project (you, about 5 minutes on any computer with Node)

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # links the project; commit the change it makes to app config if any
```

Then create the EAS environment variables. Set each one for the `production`, `preview` and `development` environments (see BUILD.md for the full list):

The bundle id defaults to `io.github.sarthak2401max.oneroomleft`. Set `ORL_IOS_BUNDLE_ID` / `ORL_ANDROID_PACKAGE` only if you want a different one.

```bash
npx eas-cli@latest env:create --environment production --name EAS_PROJECT_ID --value <id from eas init> --visibility plaintext
```

## 4. AdMob (you)

1. Add an iOS app and an Android app (choose "not yet published").
2. Create a Rewarded and an Interstitial unit in each.
3. Add `ORL_ADMOB_IOS_APP_ID`, `ORL_ADMOB_ANDROID_APP_ID` and the four unit ids as EAS production variables.
4. Privacy & messaging: publish a GDPR message, a US states message and the iOS IDFA explainer.
5. `app-ads.txt` must sit at the root of the developer website you list in the stores. GitHub Pages project sites live under a path, so this needs a separate public repo named `sarthak-2401-max.github.io` containing `app-ads.txt` (AdMob shows you the line to put in it).

A production build **refuses to start** if the bundle ids or AdMob app ids are missing, so placeholders can't ship by accident.

## 5. Build

GitHub → Actions → **EAS build** → Run workflow (platform `all`, profile `production`). Or locally:

```bash
npx eas-cli@latest build --platform all --profile production
```

On the first iOS build, EAS asks to create the signing certificate and provisioning profile with your Apple account. Run that first build **locally and interactively** so you can log in to Apple. CI builds reuse the stored credentials afterwards. Android signing keys are generated and stored by EAS automatically.

Before the store build, test a `preview` build on real phones and work through the "Device QA" list in STORE_CHECKLIST.md.

## 6. Store listings (you)

All copy is in [STORE_LISTING.md](STORE_LISTING.md), and screenshots and graphics are in `store-assets/`.

- **App Store Connect:** create the app with the same bundle id, fill the listing, App Privacy (PRIVACY.md), age rating and pricing (free). Then `npx eas-cli@latest submit --platform ios --latest` uploads the build to TestFlight. Submit for review from App Store Connect.
- **Play Console:** create the app, complete every "Set up your app" task (data safety, ads = yes, target audience 13+, content rating), and upload the listing assets. Then `npx eas-cli@latest submit --platform android --latest`. It goes to the **internal** track as a draft (`eas.json`). Promote it to closed testing, run the 12-tester/14-day test, then apply for production.

Google Play requires the first upload of a new app to be done once by hand in the Play Console (upload the `.aab` from the EAS build page). After that, `eas submit` works with a Google service-account key. See Expo's "Submit to Google Play" guide for creating that key.

## 7. After approval

- Link the live store listings in AdMob so the apps leave limited ad serving.
- Watch AdMob's policy centre and the stores' crash/ANR reports during the first week.

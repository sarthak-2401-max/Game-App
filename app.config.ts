// Expo app configuration. Everything account-specific comes from environment variables so no
// identifiers or secrets are committed. See docs/BUILD.md and docs/ADS.md.
import type { ConfigContext, ExpoConfig } from 'expo/config';

const env = process.env;

// Google's public AdMob *test* app IDs. Real app IDs must be supplied via env for release builds.
const TEST_ADMOB_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_APP_ID_IOS = 'ca-app-pub-3940256099942544~1458002511';

const IOS_BUNDLE_ID = env.ORL_IOS_BUNDLE_ID ?? 'io.github.sarthak2401max.oneroomleft';
const ANDROID_PACKAGE = env.ORL_ANDROID_PACKAGE ?? 'io.github.sarthak2401max.oneroomleft';

// Store builds must ship real, well-formed ad ids (AdMob ids or Google Ad Manager unit paths) and
// never Google's test ids. Interstitial units are optional (unset = rewarded ads only). Set
// ORL_ADS_MODE=off to ship a build without ads instead.
const GOOGLE_TEST_PUBLISHER = '3940256099942544';
const APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const UNIT_ID = /^(ca-app-pub-\d{16}\/\d{10}|\/\d+(\/[\w.-]+)+)$/;
if (env.EAS_BUILD_PROFILE === 'production' && env.ORL_ADS_MODE !== 'off') {
  const optional = ['ORL_ADMOB_IOS_INTERSTITIAL', 'ORL_ADMOB_ANDROID_INTERSTITIAL'];
  const checks: [string, RegExp][] = [
    ['ORL_ADMOB_IOS_APP_ID', APP_ID],
    ['ORL_ADMOB_ANDROID_APP_ID', APP_ID],
    ['ORL_ADMOB_IOS_REWARDED', UNIT_ID],
    ['ORL_ADMOB_IOS_INTERSTITIAL', UNIT_ID],
    ['ORL_ADMOB_ANDROID_REWARDED', UNIT_ID],
    ['ORL_ADMOB_ANDROID_INTERSTITIAL', UNIT_ID],
  ];
  // EAS sets the platform on its builders; check only that platform so an Android-only launch works.
  const platform = env.EAS_BUILD_PLATFORM;
  const bad = checks
    .filter(([name]) => !platform || name.includes(`_${platform.toUpperCase()}_`))
    .filter(([name]) => !(optional.includes(name) && !env[name]))
    .filter(([name, re]) => !re.test(env[name] ?? '') || env[name]!.includes(GOOGLE_TEST_PUBLISHER))
    .map(([name]) => name);
  if (bad.length) throw new Error(`Production build has missing, malformed or test ad ids: ${bad.join(', ')} (see docs/ADS.md)`);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'One Room Left',
  slug: 'one-room-left',
  owner: 'sarthak10',
  scheme: 'oneroomleft',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#07090F',
  ios: {
    bundleIdentifier: IOS_BUNDLE_ID,
    buildNumber: '1',
    supportsTablet: false,
    requireFullScreen: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSUserTrackingUsageDescription:
        'This lets us show you more relevant ads. You can still play everything if you choose not to allow it.',
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#07090F',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  web: {
    favicon: './assets/favicon.png',
    backgroundColor: '#07090F',
  },
  plugins: [
    'expo-audio',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#07090F' },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'This lets us show you more relevant ads. You can still play everything if you choose not to allow it.',
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: env.ORL_ADMOB_ANDROID_APP_ID ?? TEST_ADMOB_APP_ID_ANDROID,
        iosAppId: env.ORL_ADMOB_IOS_APP_ID ?? TEST_ADMOB_APP_ID_IOS,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription:
          'This lets us show you more relevant ads. You can still play everything if you choose not to allow it.',
      },
    ],
  ],
  extra: {
    ads: {
      // admob | mock | off. "mock" only works in development builds.
      mode: env.ORL_ADS_MODE ?? 'admob',
      // admob | gam. Only picks which Google test units to use when no unit ids are set.
      network: env.ORL_ADS_NETWORK ?? 'admob',
      // AdMob unit ids or Ad Manager paths (/NETWORK_CODE/...). Empty = Google test units. Production needs
      // the rewarded unit; an empty interstitial unit turns interstitials off.
      androidRewarded: env.ORL_ADMOB_ANDROID_REWARDED ?? '',
      androidInterstitial: env.ORL_ADMOB_ANDROID_INTERSTITIAL ?? '',
      iosRewarded: env.ORL_ADMOB_IOS_REWARDED ?? '',
      iosInterstitial: env.ORL_ADMOB_IOS_INTERSTITIAL ?? '',
      allowTestUnits: env.ORL_ADMOB_ALLOW_TEST_UNITS === '1',
    },
    // EAS project (expo.dev/accounts/sarthak10/projects/one-room-left). Not a secret.
    eas: { projectId: env.EAS_PROJECT_ID ?? 'a9ed4e34-a80e-4cd0-b66b-ed77b486890d' },
  },
});

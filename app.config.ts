// Expo app configuration. Everything account-specific comes from environment variables so no
// identifiers or secrets are committed. See docs/BUILD.md and docs/ADS.md.
import type { ConfigContext, ExpoConfig } from 'expo/config';

const env = process.env;

// Google's public AdMob *test* app IDs. Real app IDs must be supplied via env for release builds.
const TEST_ADMOB_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_APP_ID_IOS = 'ca-app-pub-3940256099942544~1458002511';

const IOS_BUNDLE_ID = env.ORL_IOS_BUNDLE_ID ?? 'com.example.oneroomleft';
const ANDROID_PACKAGE = env.ORL_ANDROID_PACKAGE ?? 'com.example.oneroomleft';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'One Room Left',
  slug: 'one-room-left',
  scheme: 'oneroomleft',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#07090F',
  ios: {
    bundleIdentifier: IOS_BUNDLE_ID,
    buildNumber: '1',
    supportsTablet: true,
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
      // Leave empty to use Google's test ad units. Production builds must set all four.
      androidRewarded: env.ORL_ADMOB_ANDROID_REWARDED ?? '',
      androidInterstitial: env.ORL_ADMOB_ANDROID_INTERSTITIAL ?? '',
      iosRewarded: env.ORL_ADMOB_IOS_REWARDED ?? '',
      iosInterstitial: env.ORL_ADMOB_IOS_INTERSTITIAL ?? '',
      allowTestUnits: env.ORL_ADMOB_ALLOW_TEST_UNITS === '1',
    },
    eas: env.EAS_PROJECT_ID ? { projectId: env.EAS_PROJECT_ID } : undefined,
  },
});

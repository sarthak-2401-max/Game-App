import Constants from 'expo-constants';

/** True inside the Expo Go app, which ships without third-party native modules such as AdMob. */
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

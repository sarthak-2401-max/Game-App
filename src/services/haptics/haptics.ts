// Selective haptics. Only meaningful moments vibrate (bumps, pickups, success, failure).
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

const safe = (fn: () => Promise<void>) => {
  if (!enabled || Platform.OS === 'web') return;
  fn().catch(() => undefined);
};

export const haptics = {
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

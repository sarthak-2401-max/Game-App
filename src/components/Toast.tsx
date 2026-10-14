import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../state/useToast';
import { colors, radius } from '../theme/theme';

export function Toast() {
  const { message, kind, id } = useToast();
  const insets = useSafeAreaInsets();
  if (!message) return null;
  const border = kind === 'success' ? colors.success : kind === 'warn' ? colors.amber : colors.cyan;
  return (
    <Animated.View
      key={id}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutUp.duration(150)}
      pointerEvents="none"
      style={[styles.toast, { top: insets.top + 8, borderColor: border }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 1000, backgroundColor: '#0D1322F2', borderWidth: 1, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 16 },
  text: { color: colors.text, fontWeight: '700', textAlign: 'center' },
});

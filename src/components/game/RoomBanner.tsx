// A short title card that sweeps across the board as a room opens. Purely decorative: it never
// blocks input and is skipped entirely with Reduced motion.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme/theme';

export function RoomBanner({ show, kicker, title, color }: { show: string; kicker: string; title: string; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withSequence(withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }), withDelay(750, withTiming(2, { duration: 320, easing: Easing.in(Easing.cubic) })));
  }, [show, p]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value <= 1 ? p.value : 2 - p.value,
    transform: [{ translateX: p.value <= 1 ? (1 - p.value) * -40 : (p.value - 1) * 40 }],
  }));
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.band, { borderColor: `${color}66` }, st]}>
        <Text style={[styles.kicker, { color }]}>{kicker}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  band: { paddingVertical: 10, paddingHorizontal: 28, backgroundColor: '#05070DE6', borderTopWidth: 1, borderBottomWidth: 1, alignItems: 'center', minWidth: '70%' },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
});

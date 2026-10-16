// The painted place behind the board. It drifts a few points against Pip's movement, so the
// board reads as a miniature set standing in front of a deeper room. Static with Reduced motion.
import React, { useEffect } from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DRIFT_X = 18;
const DRIFT_Y = 12;

/** `fx`/`fy` are Pip's position across the room, 0..1. */
export function Backdrop({ source, tint, fx, fy, reduced }: { source: ImageSourcePropType; tint: string; fx: number; fy: number; reduced: boolean }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  useEffect(() => {
    const tx = reduced ? 0 : -(fx - 0.5) * DRIFT_X;
    const ty = reduced ? 0 : -(fy - 0.5) * DRIFT_Y;
    const cfg = { duration: 900, easing: Easing.out(Easing.cubic) };
    x.value = withTiming(tx, cfg);
    y.value = withTiming(ty, cfg);
  }, [fx, fy, reduced, x, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 1.08 }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.Image source={source} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }, st]} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.62 }]} />
    </View>
  );
}

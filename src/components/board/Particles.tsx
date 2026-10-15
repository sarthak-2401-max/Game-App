import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { colOf, rowOf } from '../../game/grid';
import { hashString } from '../../utils/dates';

/** Deterministic 0..1 jitter so renders stay pure. */
const jitter = (seed: string) => (hashString(seed) % 1000) / 1000;

export interface BurstSpec {
  id: string;
  cell: number;
  color: string;
  count: number;
  rainbow?: boolean;
  /** Distance multiplier (default 1), dot size as a fraction of a cell, duration in ms. */
  spread?: number;
  dot?: number;
  ms?: number;
}

const RAINBOW = ['#3BE8FF', '#FFB547', '#B38CFF', '#4CF2A0', '#FF8FD1'];

function Particle({ progress, angle, dist, color, size }: { progress: SharedValue<number>; angle: number; dist: number; color: string; size: number }) {
  const st = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * dist * progress.value },
      { translateY: Math.sin(angle) * dist * progress.value },
      { scale: 1 - progress.value * 0.6 },
    ],
  }));
  return <Animated.View style={[styles.p, { width: size, height: size, borderRadius: size, backgroundColor: color }, st]} />;
}

/** A one-shot radial particle burst centred on a cell. Unmounts naturally with its key. */
export function Burst({ spec, w, size }: { spec: BurstSpec; w: number; size: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: spec.ms ?? 520, easing: Easing.out(Easing.cubic) });
  }, [progress, spec.ms]);
  const parts = useMemo(
    () =>
      Array.from({ length: spec.count }, (_, i) => ({
        angle: (Math.PI * 2 * i) / spec.count + jitter(`${spec.id}a${i}`) * 0.4,
        dist: size * (0.6 + jitter(`${spec.id}d${i}`) * 0.7) * (spec.spread ?? 1),
        color: spec.rainbow ? RAINBOW[i % RAINBOW.length] : spec.color,
      })),
    [spec, size],
  );
  return (
    <View
      pointerEvents="none"
      style={[styles.origin, { left: colOf(w, spec.cell) * size + size / 2, top: rowOf(w, spec.cell) * size + size / 2 }]}
    >
      {parts.map((p, i) => (
        <Particle key={i} progress={progress} angle={p.angle} dist={p.dist} color={p.color} size={Math.max(2, size * (spec.dot ?? 0.09))} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', width: 0, height: 0, zIndex: 20 },
  p: { position: 'absolute', left: 0, top: 0 },
});

// Animated character portraits for the story cards. Each speaker has a face drawn in SVG that
// idles quietly and comes alive while its line plays: HALE's monitor eye pulses, Pip's mouth
// lights flicker and its eyes blink, a recovered log's tape reels spin over a waveform.
// Everything runs on the UI thread with Reanimated; reduced motion shows the still faces.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { StoryBeat } from '../../game/story';
import { colors } from '../../theme/theme';

type Speaker = StoryBeat['speaker'];

interface Props {
  speaker: Speaker;
  speaking: boolean;
  reduced?: boolean;
  size?: number;
}

export function Portrait({ speaker, speaking, reduced = false, size = 112 }: Props) {
  const live = speaking && !reduced;
  if (speaker === 'HALE') return <HaleEye size={size} live={live} reduced={reduced} />;
  if (speaker === 'PIP') return <PipFace size={size} live={live} reduced={reduced} />;
  return <TapeLog size={size} live={live} />;
}

/** Bars that bounce like a level meter while `live`, and rest low otherwise. */
function Meter({ count, live, color, width, height, gap }: { count: number; live: boolean; color: string; width: number; height: number; gap: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height, gap }}>
      {Array.from({ length: count }, (_, i) => (
        <MeterBar key={i} i={i} live={live} color={color} width={width} height={height} />
      ))}
    </View>
  );
}

function MeterBar({ i, live, color, width, height }: { i: number; live: boolean; color: string; width: number; height: number }) {
  const level = useSharedValue(0.2);
  useEffect(() => {
    if (!live) {
      level.value = withTiming(0.2, { duration: 160 });
      return;
    }
    // Different speeds per bar so the meter never moves in lockstep.
    const a = 0.45 + ((i * 37) % 50) / 100;
    const b = 0.25 + ((i * 53) % 40) / 100;
    const d = 90 + ((i * 41) % 70);
    level.value = withRepeat(withSequence(withTiming(a, { duration: d }), withTiming(b, { duration: d + 30 }), withTiming(1, { duration: d - 20 }), withTiming(0.3, { duration: d + 50 })), -1, true);
    return () => cancelAnimation(level);
  }, [live, i, level]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: level.value }] }));
  return <Animated.View style={[{ width, height, borderRadius: width / 2, backgroundColor: color }, style]} />;
}

function HaleEye({ size, live, reduced }: { size: number; live: boolean; reduced: boolean }) {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.35);
  useEffect(() => {
    if (reduced) return;
    if (live) {
      pulse.value = withRepeat(withSequence(withTiming(1.16, { duration: 140 }), withTiming(0.96, { duration: 180 }), withTiming(1.1, { duration: 120 }), withTiming(1, { duration: 200 })), -1);
      glow.value = withTiming(0.8, { duration: 200 });
    } else {
      // Idle: a slow breath, like a standby light.
      pulse.value = withRepeat(withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
      glow.value = withTiming(0.35, { duration: 400 });
    }
    return () => cancelAnimation(pulse);
  }, [live, reduced, pulse, glow]);
  const iris = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.value * 0.3 }));
  const r = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: r, backgroundColor: colors.cyan, transform: [{ scale: 1.04 }] }, halo]} />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Rect x={2} y={2} width={size - 4} height={size - 4} rx={size * 0.22} fill="#071219" stroke={colors.cyan} strokeOpacity={0.6} strokeWidth={2} />
        {[0.32, 0.5, 0.68].map((f) => (
          <Line key={f} x1={8} x2={size - 8} y1={size * f} y2={size * f} stroke={colors.cyan} strokeOpacity={0.08} strokeWidth={1} />
        ))}
        <Circle cx={r} cy={r} r={r * 0.62} fill="none" stroke={colors.cyan} strokeOpacity={0.35} strokeWidth={2} />
        <Circle cx={r} cy={r} r={r * 0.46} fill="none" stroke={colors.cyan} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 5" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View style={[{ width: r * 0.56, height: r * 0.56, borderRadius: r, backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: 0.9, shadowRadius: 12 }, iris]}>
          <View style={[styles.center, { flex: 1 }]}>
            <View style={{ width: r * 0.18, height: r * 0.18, borderRadius: r, backgroundColor: '#E9FDFF' }} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function PipFace({ size, live, reduced }: { size: number; live: boolean; reduced: boolean }) {
  const blink = useSharedValue(1);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    // Blink every few seconds, a quick double now and then.
    blink.value = withRepeat(withSequence(withDelay(2600, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 90 }), withDelay(1400, withTiming(0.1, { duration: 60 })), withTiming(1, { duration: 80 })), -1);
    return () => cancelAnimation(blink);
  }, [reduced, blink]);
  useEffect(() => {
    if (reduced) return;
    bob.value = live ? withRepeat(withSequence(withTiming(-3, { duration: 220 }), withTiming(1, { duration: 260 })), -1, true) : withTiming(0, { duration: 200 });
    return () => cancelAnimation(bob);
  }, [live, reduced, bob]);
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const head = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const eye = size * 0.16;
  return (
    <Animated.View style={[{ width: size, height: size }, head]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Line x1={size / 2} x2={size / 2} y1={size * 0.04} y2={size * 0.18} stroke={colors.amber} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={size / 2} cy={size * 0.05} r={size * 0.04} fill={live ? colors.amber : colors.amberDim} />
        <Rect x={size * 0.1} y={size * 0.18} width={size * 0.8} height={size * 0.72} rx={size * 0.18} fill="#1A1408" stroke={colors.amber} strokeWidth={2.5} />
        <Rect x={size * 0.2} y={size * 0.3} width={size * 0.6} height={size * 0.3} rx={size * 0.1} fill="#0B0904" />
      </Svg>
      <Animated.View style={[styles.pipEyes, { top: size * 0.37, left: size * 0.29, right: size * 0.29, height: eye }, eyes]}>
        <View style={{ width: eye, height: eye, borderRadius: eye, backgroundColor: colors.amber }} />
        <View style={{ width: eye, height: eye, borderRadius: eye, backgroundColor: colors.amber }} />
      </Animated.View>
      <View style={[styles.center, { position: 'absolute', left: 0, right: 0, top: size * 0.67 }]}>
        <Meter count={5} live={live} color={colors.amber} width={size * 0.05} height={size * 0.14} gap={size * 0.03} />
      </View>
    </Animated.View>
  );
}

function TapeReel({ r, spin }: { r: number; spin: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  return (
    <Animated.View style={[{ width: r * 2, height: r * 2 }, style]}>
      <Svg width={r * 2} height={r * 2}>
        <Circle cx={r} cy={r} r={r - 1} fill="none" stroke={colors.violet} strokeWidth={2} />
        {[0, 60, 120].map((a) => {
          const dx = Math.cos((a * Math.PI) / 180) * r * 0.85;
          const dy = Math.sin((a * Math.PI) / 180) * r * 0.85;
          return <Line key={a} x1={r + dx} y1={r + dy} x2={r - dx} y2={r - dy} stroke={colors.violet} strokeOpacity={0.7} strokeWidth={1.5} />;
        })}
      </Svg>
    </Animated.View>
  );
}

function TapeLog({ size, live }: { size: number; live: boolean }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!live) return;
    spin.value = 0;
    spin.value = withRepeat(withTiming(360, { duration: 1600, easing: Easing.linear }), -1);
    return () => cancelAnimation(spin);
  }, [live, spin]);
  const r = size * 0.15;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Rect x={2} y={size * 0.16} width={size - 4} height={size * 0.68} rx={size * 0.08} fill="#120C1F" stroke={colors.violet} strokeWidth={2} />
        <Circle cx={size * 0.86} cy={size * 0.25} r={size * 0.03} fill={live ? colors.rec : '#4A2530'} />
      </Svg>
      <View style={[styles.reels, { top: size * 0.24, paddingHorizontal: size * 0.14 }]}>
        <TapeReel r={r} spin={spin} />
        <TapeReel r={r} spin={spin} />
      </View>
      <View style={[styles.center, { position: 'absolute', left: 0, right: 0, top: size * 0.62 }]}>
        <Meter count={9} live={live} color={colors.violet} width={size * 0.03} height={size * 0.14} gap={size * 0.025} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  pipEyes: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between' },
  reels: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
});

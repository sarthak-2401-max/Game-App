// Brings the painted characters to life: draws eyelids over Pip's eyes (blinking, and shaped to
// the shot's mood) and a glow over Pip's or HALE's eye while that character speaks. Positions
// come from src/game/sceneRigs.generated.json (scripts/locate-eyes.py), in 0..1 image coordinates;
// this layer sits inside the panning image, so it moves with the painting.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import type { Mood } from '../../game/scenes';
import { colors } from '../../theme/theme';

export interface Eye {
  x: number;
  y: number;
  rx: number;
  ry: number;
}
export interface Rig {
  pip?: Eye[];
  hale?: Eye;
}

/** Resting lids per mood: how far the top lid covers the eye, its tilt, and the bottom lid. */
const LIDS: Record<Mood, { top: number; tilt: number; bottom: number; wide?: boolean }> = {
  neutral: { top: 0.08, tilt: 0, bottom: 0 },
  happy: { top: 0, tilt: 0, bottom: 0.42 },
  worried: { top: 0.3, tilt: -16, bottom: 0 },
  determined: { top: 0.4, tilt: 14, bottom: 0.12 },
  surprised: { top: 0, tilt: 0, bottom: 0, wide: true },
  sad: { top: 0.42, tilt: -20, bottom: 0 },
};
const LID = '#120E0A';

function PipEye({ eye, side, w, h, mood, blink, speaking, reduced }: { eye: Eye; side: 'left' | 'right'; w: number; h: number; mood: Mood; blink: { value: number }; speaking: boolean; reduced: boolean }) {
  const lids = LIDS[mood];
  const ew = eye.rx * 2 * w * 1.15;
  const eh = eye.ry * 2 * h * 1.15;
  const tilt = side === 'left' ? lids.tilt : -lids.tilt;
  const glow = useSharedValue(0);
  useEffect(() => {
    if (speaking && !reduced) glow.value = withRepeat(withSequence(withTiming(0.45, { duration: 120 }), withTiming(0.12, { duration: 160 }), withTiming(0.35, { duration: 110 }), withTiming(0.05, { duration: 200 })), -1);
    else glow.value = withTiming(lids.wide ? 0.15 : 0, { duration: 250 });
    return () => cancelAnimation(glow);
  }, [speaking, reduced, lids.wide, glow]);
  const top = useAnimatedStyle(() => {
    // 0 = resting lid, 1 = fully closed.
    const cover = lids.top + (1 - lids.top) * blink.value;
    return { transform: [{ translateY: -eh * 1.2 + eh * 1.2 * cover }, { rotate: `${tilt}deg` }] };
  });
  const bottom = useAnimatedStyle(() => ({ transform: [{ translateY: eh * 1.2 - eh * 1.2 * Math.max(lids.bottom, blink.value * 0.3) }] }));
  const shine = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <View style={{ position: 'absolute', left: eye.x * w - ew / 2, top: eye.y * h - eh / 2, width: ew, height: eh, transform: [{ scale: lids.wide ? 1.12 : 1 }] }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: ew, backgroundColor: colors.amber, shadowColor: colors.amber, shadowOpacity: 1, shadowRadius: ew / 2 }, shine]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: ew, overflow: 'hidden' }]}>
        <Animated.View style={[styles.lid, { height: eh * 1.2, left: -ew * 0.2, right: -ew * 0.2, top: 0 }, top]} />
        <Animated.View style={[styles.lid, { height: eh * 1.2, left: -ew * 0.2, right: -ew * 0.2, top: 0, borderTopLeftRadius: ew, borderTopRightRadius: ew }, bottom]} />
      </View>
    </View>
  );
}

function HaleEye({ eye, w, h, speaking, reduced }: { eye: Eye; w: number; h: number; speaking: boolean; reduced: boolean }) {
  const glow = useSharedValue(0.1);
  useEffect(() => {
    if (reduced) return;
    glow.value = speaking
      ? withRepeat(withSequence(withTiming(0.55, { duration: 140 }), withTiming(0.2, { duration: 170 }), withTiming(0.45, { duration: 120 }), withTiming(0.15, { duration: 220 })), -1)
      : withRepeat(withTiming(0.22, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(glow);
  }, [speaking, reduced, glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 1 + glow.value * 0.12 }] }));
  const ew = eye.rx * 2 * w;
  const eh = eye.ry * 2 * h;
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: eye.x * w - ew / 2, top: eye.y * h - eh / 2, width: ew, height: eh, borderRadius: ew, backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: 1, shadowRadius: ew / 2 }, style]} />;
}

export function SceneRig({ rig, w, h, mood = 'neutral', speaker, speaking, reduced }: { rig: Rig; w: number; h: number; mood?: Mood; speaker: string; speaking: boolean; reduced: boolean }) {
  const blink = useSharedValue(0);
  useEffect(() => {
    if (reduced || !rig.pip) return;
    // A blink every few seconds, with an occasional double blink.
    blink.value = withRepeat(
      withSequence(withDelay(2400, withTiming(1, { duration: 70 })), withTiming(0, { duration: 110 }), withDelay(3100, withTiming(1, { duration: 70 })), withTiming(0, { duration: 90 }), withDelay(140, withTiming(1, { duration: 60 })), withTiming(0, { duration: 110 })),
      -1,
    );
    return () => cancelAnimation(blink);
  }, [reduced, rig.pip, blink]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {rig.hale && <HaleEye eye={rig.hale} w={w} h={h} speaking={speaking && speaker === 'HALE'} reduced={reduced} />}
      {rig.pip?.map((eye, i) => (
        <PipEye key={i} eye={eye} side={i === 0 ? 'left' : 'right'} w={w} h={h} mood={mood} blink={blink} speaking={speaking && speaker === 'PIP'} reduced={reduced} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lid: { position: 'absolute', backgroundColor: LID },
});

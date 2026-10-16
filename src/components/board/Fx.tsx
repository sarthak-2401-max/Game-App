// Game feel: short, interruptible animations layered on top of the rules. None of them delays
// input (a new action simply restarts them) and all of them switch off with Reduced motion.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colOf, rowOf } from '../../game/grid';
import type { StepEvent } from '../../game/types';
import { hashString } from '../../utils/dates';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

const ease = Easing.out(Easing.cubic);

/**
 * Wraps the player sprite: squash and lean into each step, a nudge against walls, a wobble when
 * caught, and a spin into the exit on a win.
 */
export function PlayerFx({ seq, events, w, size, reduced, children }: { seq: number; events: StepEvent[]; w: number; size: number; reduced: boolean; children: React.ReactNode }) {
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const rot = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    const reset = () => {
      sx.value = 1;
      sy.value = 1;
      rot.value = 0;
      tx.value = 0;
      ty.value = 0;
      op.value = 1;
    };
    if (reduced) return reset();
    const win = events.some((e) => e.type === 'win');
    const death = events.some((e) => e.type === 'death');
    const move = events.find((e): e is Extract<StepEvent, { type: 'move' }> => e.type === 'move');
    const bump = events.find((e): e is Extract<StepEvent, { type: 'bump' }> => e.type === 'bump');
    if (win) {
      // A little victory hop on the threshold, then Pip rolls on through the open door.
      const hop = size * 0.22;
      rot.value = 0;
      ty.value = withDelay(
        140,
        withSequence(
          withTiming(-hop, { duration: 170, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
          withDelay(80, withTiming(-size * 0.14, { duration: 460, easing: Easing.in(Easing.cubic) })),
        ),
      );
      sy.value = withDelay(140, withSequence(withTiming(1.12, { duration: 170 }), withTiming(0.86, { duration: 150 }), withSpring(1, { damping: 8 }), withTiming(0.5, { duration: 380 })));
      sx.value = withDelay(140, withSequence(withTiming(0.92, { duration: 170 }), withTiming(1.12, { duration: 150 }), withSpring(1, { damping: 8 }), withTiming(0.5, { duration: 380 })));
      op.value = withDelay(620, withTiming(0, { duration: 360 }));
      return;
    }
    if (death) {
      op.value = 1;
      rot.value = withSequence(withTiming(-14, { duration: 60 }), withTiming(12, { duration: 80 }), withTiming(-8, { duration: 80 }), withTiming(0, { duration: 90 }));
      sy.value = withSequence(withTiming(0.7, { duration: 90 }), withSpring(1, { damping: 8 }));
      sx.value = withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, { damping: 8 }));
      return;
    }
    if (move) {
      const dx = colOf(w, move.to) - colOf(w, move.from);
      const dy = rowOf(w, move.to) - rowOf(w, move.from);
      const horiz = Math.abs(dx) >= Math.abs(dy);
      op.value = 1;
      tx.value = 0;
      ty.value = 0;
      sx.value = withSequence(withTiming(horiz ? 1.14 : 0.9, { duration: 55, easing: ease }), withSpring(1, { damping: 9, stiffness: 260 }));
      sy.value = withSequence(withTiming(horiz ? 0.9 : 1.12, { duration: 55, easing: ease }), withSpring(1, { damping: 9, stiffness: 260 }));
      rot.value = withSequence(withTiming(horiz ? Math.sign(dx) * 9 : 0, { duration: 60 }), withSpring(0, { damping: 10, stiffness: 220 }));
      return;
    }
    // Bumps are handled by useBumpNudge, on the Mover around this wrapper.
    if (bump) return;
    reset();
    // seq identifies the action; events alone may be the same array shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq, reduced]);

  const st = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${rot.value}deg` }, { scaleX: sx.value }, { scaleY: sy.value }],
  }));
  return <Animated.View style={[{ width: size, height: size }, st]}>{children}</Animated.View>;
}

/** Leans the player toward a wall it walked into, then springs back. */
export function useBumpNudge(seq: number, events: StepEvent[], player: number, w: number, size: number, reduced: boolean) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  useEffect(() => {
    const bump = events.find((e): e is Extract<StepEvent, { type: 'bump' }> => e.type === 'bump');
    if (reduced || !bump) return;
    const dx = Math.sign(colOf(w, bump.at) - colOf(w, player));
    const dy = Math.sign(rowOf(w, bump.at) - rowOf(w, player));
    const n = size * 0.16;
    tx.value = withSequence(withTiming(dx * n, { duration: 60, easing: ease }), withSpring(0, { damping: 7, stiffness: 300 }));
    ty.value = withSequence(withTiming(dy * n, { duration: 60, easing: ease }), withSpring(0, { damping: 7, stiffness: 300 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));
}

/** A short label that rises and fades from a cell ("+1 key", "Core 2/3"). */
export function FloatText({ cell, w, size, text, color }: { cell: number; w: number; size: number; text: string; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [p]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value < 0.15 ? p.value / 0.15 : 1 - Math.max(0, (p.value - 0.55) / 0.45),
    transform: [{ translateY: -size * 0.9 * p.value }, { scale: 0.8 + Math.min(1, p.value * 4) * 0.2 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.float, { left: colOf(w, cell) * size - size, top: rowOf(w, cell) * size, width: size * 3 }, st]}>
      <Text style={[styles.floatText, { color, fontSize: Math.max(11, size * 0.26) }]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

/** An expanding ring from a cell: exits opening, switches, checkpoints. */
export function Ring({ cell, w, size, color }: { cell: number; w: number; size: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 650, easing: ease });
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - p.value), transform: [{ scale: 0.4 + p.value * 1.8 }] }));
  return (
    <View pointerEvents="none" style={[styles.ringBox, { left: colOf(w, cell) * size, top: rowOf(w, cell) * size, width: size, height: size }]}>
      <Animated.View style={[{ width: size * 0.9, height: size * 0.9, borderRadius: size, borderWidth: Math.max(2, size * 0.06), borderColor: color }, st]} />
    </View>
  );
}

/** A full-board flash (win, death). */
export function Flash({ color, seq }: { color: string; seq: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withSequence(withTiming(0.32, { duration: 70 }), withTiming(0, { duration: 420 }));
  }, [seq, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, zIndex: 19 }, st]} />;
}

/** How each environment's air moves: colour (null = the room's glow), size, drift direction, shape. */
export const MOTE_STYLES: Record<string, { color: string | null; size: number; dir: 1 | -1; square?: boolean; ring?: boolean; bright?: number }> = {
  dust: { color: null, size: 1, dir: 1 },
  steam: { color: '#E8FFF8', size: 3.2, dir: 1, bright: 0.5 },
  spores: { color: '#B6F27A', size: 1.4, dir: 1 },
  bubbles: { color: '#9FE8FF', size: 2.2, dir: 1, ring: true },
  snow: { color: '#F2FBFF', size: 1.5, dir: -1 },
  sparks: { color: '#FFC24D', size: 0.9, dir: 1, bright: 1.6 },
  data: { color: null, size: 1.2, dir: 1, square: true },
  fireflies: { color: '#FFE36E', size: 1.3, dir: 1, bright: 1.8 },
  embers: { color: '#FF8A4C', size: 1.1, dir: 1, bright: 1.5 },
  stars: { color: '#FFFFFF', size: 1, dir: 1, bright: 1.4 },
};

function Mote({ W, H, seed, color, kind }: { W: number; H: number; seed: number; color: string; kind: string }) {
  const r = (k: number) => (hashString(`${seed}:${k}`) % 1000) / 1000;
  const m = MOTE_STYLES[kind] ?? MOTE_STYLES.dust;
  const x0 = r(1) * W;
  const y0 = r(2) * H;
  const drift = (18 + r(3) * 30) * m.dir;
  const dur = 5200 + r(4) * 5200;
  const s = (1.5 + r(5) * 2) * m.size;
  const peak = 0.38 * (m.bright ?? 1);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(r(6) * 3000, withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }), -1, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: 0.12 + peak * Math.sin(p.value * Math.PI), transform: [{ translateY: -drift * p.value }, { translateX: Math.sin(p.value * 6.28) * 6 }] }));
  const c = m.color ?? color;
  const shape = m.ring ? { borderWidth: 1, borderColor: c } : { backgroundColor: c };
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x0, top: y0, width: s, height: s, borderRadius: m.square ? 0 : s }, shape, st]} />;
}

/** Dust drifting through the light: makes a still room feel inhabited. `kind` picks the room's air. */
export function Motes({ W, H, color, count = 12, seed = 0, kind = 'dust' }: { W: number; H: number; color: string; count?: number; seed?: number; kind?: string }) {
  const list = useMemo(() => Array.from({ length: count }, (_, i) => seed * 100 + i), [count, seed]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 13 }]}>
      {list.map((k) => (
        <Mote key={`${kind}${k}`} W={W} H={H} seed={k} color={color} kind={kind} />
      ))}
    </View>
  );
}

/** A breathing halo, e.g. around an open exit. */
export function Breathe({ size, color, enabled }: { size: number; color: string; enabled: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = enabled ? withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true) : 0;
  }, [enabled, p]);
  const st = useAnimatedStyle(() => ({ opacity: 0.18 + 0.32 * p.value, transform: [{ scale: 0.86 + 0.16 * p.value }] }));
  if (!enabled) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[{ width: size * 0.92, height: size * 0.92, borderRadius: size, borderWidth: 2, borderColor: color, backgroundColor: `${color}22` }, st]} />
    </View>
  );
}

const styles = StyleSheet.create({
  float: { position: 'absolute', alignItems: 'center', zIndex: 21 },
  floatText: { fontWeight: '900', letterSpacing: 0.4, textShadowColor: '#000000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  ringBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 18 },
});

/**
 * A room's ending: light pours up out of the open exit and the whole room warms to its glow.
 * Mounted only on a win (and never with Reduced motion); two animated views, no per-frame work.
 */
export function WinLights({ cell, w, size, W, H, color }: { cell: number; w: number; size: number; W: number; H: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [p]);
  const room = useAnimatedStyle(() => ({ opacity: 0.16 * p.value }));
  const pillarH = size * 3;
  const pillar = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.6) * (1 - 0.35 * p.value), transform: [{ translateY: (1 - p.value) * pillarH * 0.5 }, { scaleY: 0.2 + 0.8 * p.value }] }));
  const x = colOf(w, cell) * size;
  const y = rowOf(w, cell) * size;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 12 }]}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundColor: color }, room]} />
      <Animated.View style={[{ position: 'absolute', left: x + size * 0.12, top: y + size * 0.85 - pillarH, width: size * 0.76, height: pillarH }, pillar]}>
        <Svg width={size * 0.76} height={pillarH}>
          <Defs>
            <LinearGradient id="winPillar" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
              <Stop offset="0.25" stopColor={color} stopOpacity={0.55} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size * 0.76} height={pillarH} rx={size * 0.3} fill="url(#winPillar)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Tired lights: the room dips dark in short, irregular stutters, then holds steady for a while. */
export function Flicker({ seed }: { seed: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    const r = (k: number) => (hashString(`${seed}:fl${k}`) % 1000) / 1000;
    const hold = (ms: number) => withTiming(0, { duration: ms });
    const dip = (a: number, ms: number) => withSequence(withTiming(a, { duration: 30 }), withTiming(a, { duration: ms }), withTiming(0, { duration: 40 }));
    o.value = withRepeat(withSequence(hold(2200 + r(1) * 2400), dip(0.22, 50), hold(90), dip(0.14, 40), hold(3000 + r(2) * 3000), dip(0.18, 70)), -1);
  }, [seed, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', zIndex: 14 }, st]} />;
}

/** Frost creeping in from the corners of a cold room, breathing slowly. */
export function Frost({ W, H, reduced }: { W: number; H: number; reduced: boolean }) {
  const p = useSharedValue(0.7);
  useEffect(() => {
    if (!reduced) p.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, p]);
  const st = useAnimatedStyle(() => ({ opacity: p.value }));
  const r = Math.max(W, H) * 0.55;
  const corners: [number, number][] = [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ];
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 13 }, st]}>
      <Svg width={W} height={H}>
        <Defs>
          {corners.map(([cx, cy], i) => (
            <RadialGradient key={i} id={`frost${i}`} cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#E8F7FF" stopOpacity={0.42} />
              <Stop offset="0.35" stopColor="#BFE6FF" stopOpacity={0.12} />
              <Stop offset="1" stopColor="#BFE6FF" stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {corners.map((_, i) => (
          <Rect key={i} x={0} y={0} width={W} height={H} fill={`url(#frost${i})`} />
        ))}
        <Rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="#E8F7FF" strokeOpacity={0.35} strokeWidth={2} />
      </Svg>
    </Animated.View>
  );
}

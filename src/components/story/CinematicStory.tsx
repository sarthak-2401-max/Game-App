// Cinematic story player: each beat is an illustrated scene that slowly pans and zooms while its
// line plays, crossfading to the next beat's scene. The line is subtitled at the bottom next to
// the speaker's animated portrait. Tap anywhere to advance. Reduced motion keeps the pictures
// still and shows each line whole.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { StoryBeat } from '../../game/story';
import { sound } from '../../services/audio/sound';
import { voice } from '../../services/audio/voice';
import type { StoryScene } from '../../services/story/storyScenes';
import { useApp } from '../../state/useApp';
import { colors, space } from '../../theme/theme';
import { Ambient } from '../Ambient';
import { Button } from '../ui';
import { Portrait } from './Portrait';
import { SceneRig } from './SceneRig';
import { useVoiceSpeaking } from './useVoiceSpeaking';

const NAME: Record<StoryBeat['speaker'], { name: string; color: string }> = {
  HALE: { name: 'HALE', color: colors.cyan },
  PIP: { name: 'PIP', color: colors.amber },
  LOG: { name: 'RECOVERED LOG', color: colors.violet },
};

/** How a shot moves: alternate push-ins and pans so consecutive scenes never move alike. */
const MOVES = [
  { from: { s: 1.06, x: 0, y: 14 }, to: { s: 1.18, x: 0, y: -10 } },
  { from: { s: 1.16, x: -16, y: 0 }, to: { s: 1.1, x: 16, y: 0 } },
  { from: { s: 1.18, x: 0, y: -8 }, to: { s: 1.06, x: 0, y: 8 } },
  { from: { s: 1.12, x: 14, y: 6 }, to: { s: 1.2, x: -10, y: -6 } },
];
const SHOT_MS = 14000;

/** The paintings are 768x1344; they fill the screen like `cover`, cropping the overflow. */
const ART_W = 768;
const ART_H = 1344;

function Shot({ scene, index, reduced, speaker, speaking }: { scene: StoryScene; index: number; reduced: boolean; speaker: string; speaking: boolean }) {
  const win = useWindowDimensions();
  const k = Math.max(win.width / ART_W, win.height / ART_H);
  const w = ART_W * k;
  const h = ART_H * k;
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduced) t.value = withTiming(1, { duration: SHOT_MS, easing: Easing.out(Easing.quad) });
  }, [reduced, t]);
  const m = MOVES[index % MOVES.length];
  const style = useAnimatedStyle(() => {
    const k = t.value;
    return {
      transform: [
        { translateX: m.from.x + (m.to.x - m.from.x) * k },
        { translateY: m.from.y + (m.to.y - m.from.y) * k },
        { scale: m.from.s + (m.to.s - m.from.s) * k },
      ],
    };
  });
  return (
    <Animated.View entering={FadeIn.duration(reduced ? 0 : 900)} exiting={FadeOut.duration(reduced ? 0 : 900)} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <View style={{ position: 'absolute', width: w, height: h, left: (win.width - w) / 2, top: (win.height - h) / 2 }}>
          <Image source={scene.source} style={styles.image} />
          <SceneRig rig={scene.rig} w={w} h={h} mood={scene.mood} speaker={speaker} speaking={speaking} reduced={reduced} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Darkens the top and bottom of the frame so the titles and subtitles stay readable. */
function Shade() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity={0.7} />
            <Stop offset="0.22" stopColor="#000" stopOpacity={0} />
            <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.92} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#shade)" />
      </Svg>
    </View>
  );
}

function useTyped(text: string, on: boolean): string {
  const [n, setN] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart the typewriter for a new line
    setN(0);
    const t = setInterval(() => setN((k) => (k >= text.length ? (clearInterval(t), k) : k + 1)), 40);
    return () => clearInterval(t);
  }, [text, on]);
  return on ? text.slice(0, n) : text;
}

export function CinematicStory({ kicker, title, beats, scenes, onDone }: { kicker: string; title: string; beats: readonly StoryBeat[]; scenes: readonly (StoryScene | undefined)[]; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useApp((st) => st.save.settings.reducedMotion);
  const speaking = useVoiceSpeaking();
  const [at, setAt] = useState(0);
  const beat = beats[at];
  const last = at >= beats.length - 1;
  const text = useTyped(beat?.text ?? '', !reduced);
  const finish = () => {
    voice.stop();
    onDone();
  };
  const advance = () => (last ? finish() : setAt((n) => n + 1));
  useEffect(() => {
    if (beat) voice.say(beat.text, beat.speaker);
  }, [beat]);
  useEffect(() => () => voice.stop(), []);
  // The score follows Pip's mood in each shot.
  const mood = scenes[at]?.mood ?? 'neutral';
  useEffect(() => sound.setScene(`story-${mood}`), [mood]);
  useEffect(() => () => sound.setScene(null), []);
  if (!beat) return null;
  const sp = NAME[beat.speaker];
  const scene = scenes[at];
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.root}>
      {scene ? <Shot key={at} scene={scene} index={at} reduced={reduced} speaker={beat.speaker} speaking={speaking} /> : <Ambient color={sp.color} cy={0.35} strength={0.18} />}
      <Shade />
      <Pressable style={[styles.fill, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.md }]} onPress={advance} accessibilityRole="button" accessibilityLabel={last ? 'Begin' : 'Next'}>
        <Animated.View entering={FadeIn.delay(300).duration(700)}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </Animated.View>
        <View style={styles.dots}>
          {beats.map((_, i) => (
            <View key={i} style={[styles.dot, i === at && styles.dotOn, i < at && styles.dotDone]} />
          ))}
        </View>
        <View style={styles.spacer} />
        <View style={styles.subtitle}>
          <Animated.View key={beat.speaker} entering={FadeIn.duration(250)}>
            <Portrait speaker={beat.speaker} speaking={speaking} reduced={reduced} size={56} />
          </Animated.View>
          <View style={styles.lineBox}>
            <Text style={[styles.speaker, { color: sp.color }]}>{beat.source ? `${sp.name} · ${beat.source}` : sp.name}</Text>
            <Text style={[styles.line, beat.speaker === 'LOG' && styles.logLine]} accessibilityLabel={beat.text}>
              {text}
            </Text>
          </View>
        </View>
        <Text style={styles.hint}>{last ? '' : 'Tap to continue'}</Text>
      </Pressable>
      <View style={[styles.actions, { bottom: insets.bottom + space.md }]}>
        {last ? <Button label="Begin" icon="play" variant="primary" onPress={finish} /> : <Button label="Skip" variant="ghost" onPress={finish} />}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, elevation: 200, backgroundColor: '#000', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  fill: { flex: 1, paddingHorizontal: space.xl, maxWidth: 640, width: '100%', alignSelf: 'center' },
  kicker: { color: colors.cyan, fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', textShadowColor: '#000', textShadowRadius: 6 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4, textShadowColor: '#000', textShadowRadius: 10 },
  dots: { flexDirection: 'row', gap: 6, marginTop: space.md },
  dot: { width: 14, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF33' },
  dotOn: { backgroundColor: colors.text, width: 24 },
  dotDone: { backgroundColor: '#FFFFFF88' },
  spacer: { flex: 1 },
  subtitle: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.md },
  lineBox: { flex: 1, gap: 4, minHeight: 104 },
  speaker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  line: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 8 },
  logLine: { fontStyle: 'italic', color: '#E4DCFF' },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: 56 },
  actions: { position: 'absolute', left: space.xl, right: space.xl, maxWidth: 560, alignSelf: 'center' },
});

// Full-screen story card: shows a sequence of beats one at a time. Tap anywhere to advance.
// With voiceover on, each beat is read aloud as it appears.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StoryBeat } from '../game/story';
import { voice } from '../services/audio/voice';
import { useApp } from '../state/useApp';
import { colors, radius, space } from '../theme/theme';
import { Ambient } from './Ambient';
import { PlayerGlyph } from './board/glyphs';
import { Icon } from './Icon';
import { Button } from './ui';

export const SPEAKER: Record<StoryBeat['speaker'], { name: string; color: string }> = {
  HALE: { name: 'HALE', color: colors.cyan },
  PIP: { name: 'PIP', color: colors.amber },
  LOG: { name: 'RECOVERED LOG', color: colors.violet },
};

/** Replays a line in its character's voice (shown only while voiceover is on). */
export function ListenButton({ beat, color }: { beat: StoryBeat; color: string }) {
  const on = useApp((s) => s.save.settings.voiceover);
  if (!on) return null;
  return (
    <Pressable onPress={() => voice.say(beat.text, beat.speaker)} hitSlop={10} style={styles.listen} accessibilityRole="button" accessibilityLabel="Listen">
      <Icon name="voice" size={16} color={color} />
    </Pressable>
  );
}

/** `listen` adds a replay button; off where the beat already sits inside a pressable. */
export function BeatView({ beat, compact, listen = true }: { beat: StoryBeat; compact?: boolean; listen?: boolean }) {
  const sp = SPEAKER[beat.speaker];
  return (
    <View style={[styles.beat, compact && styles.beatCompact, { borderLeftColor: sp.color }]}>
      <View style={styles.speakerRow}>
        <Text style={[styles.speaker, { color: sp.color }]}>{beat.source ? `${sp.name} · ${beat.source}` : sp.name}</Text>
        {listen && <ListenButton beat={beat} color={sp.color} />}
      </View>
      <Text style={[compact ? styles.textCompact : styles.text, beat.speaker === 'LOG' && styles.logText]}>{beat.text}</Text>
    </View>
  );
}

export function StoryCard({ kicker, title, beats, onDone }: { kicker: string; title: string; beats: readonly StoryBeat[]; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(1);
  const done = shown >= beats.length;
  const finish = () => {
    voice.stop();
    onDone();
  };
  const advance = () => (done ? finish() : setShown((n) => n + 1));
  // Read the newest beat; the next tap cuts it off and reads the one after.
  useEffect(() => {
    const b = beats[shown - 1];
    if (b) voice.say(b.text, b.speaker);
  }, [shown, beats]);
  useEffect(() => () => voice.stop(), []);
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.root, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg }]}>
      <Ambient color={colors.cyan} cy={0.3} strength={0.14} />
      <Pressable style={styles.fill} onPress={advance} accessibilityRole="button" accessibilityLabel={done ? 'Begin' : 'Next'}>
        <View style={styles.scan} pointerEvents="none" />
        <View style={styles.emblem}>
          <PlayerGlyph s={72} color={colors.cyan} shape="circle" />
        </View>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.beats}>
          {beats.slice(0, shown).map((b, i) => (
            <Animated.View key={i} entering={FadeInDown.duration(350)}>
              <BeatView beat={b} listen={false} />
            </Animated.View>
          ))}
        </View>
        <Text style={styles.tapHint}>{done ? '' : 'Tap to continue'}</Text>
      </Pressable>
      <View style={styles.actions}>
        {done ? (
          <Button label="Begin" icon="play" variant="primary" onPress={finish} />
        ) : (
          <Button label="Skip" variant="ghost" onPress={finish} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, elevation: 200, backgroundColor: '#04060B', paddingHorizontal: space.xl },
  fill: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center', justifyContent: 'center' },
  scan: { position: 'absolute', left: -space.xl, right: -space.xl, top: 0, height: 2, backgroundColor: '#3BE8FF22' },
  emblem: { alignSelf: 'flex-start', marginBottom: space.lg, opacity: 0.9 },
  kicker: { color: colors.cyan, fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 6, marginBottom: space.xl },
  beats: { gap: space.lg },
  beat: { borderLeftWidth: 3, paddingLeft: space.md, paddingVertical: 2, gap: 4 },
  beatCompact: { paddingLeft: space.sm, borderRadius: radius.sm },
  speakerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speaker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, flexShrink: 1 },
  listen: { padding: 2, opacity: 0.85 },
  text: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '500' },
  textCompact: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  logText: { fontStyle: 'italic', color: '#D9D2FF' },
  tapHint: { color: colors.textMuted, marginTop: space.xl, fontSize: 13 },
  actions: { maxWidth: 560, width: '100%', alignSelf: 'center' },
});

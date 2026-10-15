// The monitor strip above the board. It shows the room's instruction, and anything WITNESS (or
// HALE) says, typed out like a terminal. It never blocks input: lines queue up and play one
// at a time, and a tap finishes or skips the current one. With voiceover on, each line is also
// read aloud and stays up until the voice finishes.
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { voice } from '../../services/audio/voice';
import { colors, radius } from '../../theme/theme';
import { Icon } from '../Icon';

export interface FeedItem {
  /** Unique per item (used to consume it). */
  key: string;
  speaker: 'WITNESS' | 'HALE' | 'PIP' | 'CLUE';
  /** Small caption above the text, e.g. "Recording · Priya Shah". */
  label?: string;
  text: string;
  /** For clue items: opens the full clue when tapped. */
  clueId?: string;
  /** The line as written, when `text` has numbers filled in: finds its recording. */
  voiceKey?: string;
}

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
export const MONITOR_HEIGHT = 74;

const LOOK = {
  WITNESS: { color: colors.witness, border: '#3A4152', name: 'WITNESS' },
  HALE: { color: colors.cyan, border: colors.cyanDim, name: 'HALE' },
  PIP: { color: colors.amber, border: '#5A4220', name: 'PIP' },
  CLUE: { color: '#C9A6FF', border: '#4B3B6E', name: 'FOUND' },
} as const;

function RecDot({ on, reduced }: { on: boolean; reduced: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = on && !reduced ? withRepeat(withSequence(withTiming(0.2, { duration: 600 }), withTiming(1, { duration: 600 })), -1) : 1;
  }, [on, reduced, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: on ? colors.rec : '#3A2026' }, st]} />;
}

export function MonitorBar({
  item,
  intro,
  reducedMotion,
  watched,
  onDone,
  onShow,
  onOpenClue,
}: {
  item?: FeedItem;
  /** Room instruction shown when nothing else is playing. */
  intro?: string;
  reducedMotion: boolean;
  /** WITNESS has spoken in this room: the recording light stays on. */
  watched: boolean;
  onDone: (key: string) => void;
  onShow?: (item: FeedItem) => void;
  onOpenClue?: (id: string) => void;
}) {
  const [shown, setShown] = useState(0);
  // The voice has finished this line (or there is no voice for it).
  const [voiced, setVoiced] = useState(true);
  const usedVoice = useRef(false);
  const currentKey = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = item?.text ?? '';
  const typing = !!item && shown < text.length;

  // A new item: announce it, then type it out.
  useEffect(() => {
    if (!item) return;
    onShow?.(item);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart the typewriter for each new line
    setShown(reducedMotion ? item.text.length : 0);
    usedVoice.current = item.speaker !== 'CLUE' && voice.isEnabled;
    currentKey.current = item.key;
    if (item.speaker === 'CLUE') setVoiced(true);
    else {
      setVoiced(false);
      const key = item.key;
      // A cut-off earlier line reports back too: only this line's end counts.
      voice.say(
        item.text,
        item.speaker,
        () => {
          if (currentKey.current === key) setVoiced(true);
        },
        item.voiceKey,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.key]);

  // Leaving the game (or the bar unmounting) silences the line.
  useEffect(() => () => voice.stop(), []);

  useEffect(() => {
    if (!item) return;
    if (timer.current) clearTimeout(timer.current);
    if (shown < text.length) {
      timer.current = setTimeout(() => setShown((n) => Math.min(text.length, n + 2)), 22);
    } else if (!voiced) {
      // Wait for the voice, with a cap in case the speech engine never reports back.
      timer.current = setTimeout(() => onDone(item.key), 20_000);
    } else {
      const hold = usedVoice.current ? 900 : Math.max(2600, Math.min(7000, text.length * 48));
      timer.current = setTimeout(() => onDone(item.key), hold + (item.clueId ? 1500 : 0));
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [item, shown, voiced, text.length, onDone]);

  const tap = () => {
    if (!item) return;
    if (typing) setShown(text.length);
    else if (!voiced) {
      voice.stop();
      onDone(item.key);
    } else if (item.clueId && onOpenClue) {
      onOpenClue(item.clueId);
      onDone(item.key);
    } else onDone(item.key);
  };

  if (!item) {
    return (
      <View style={[styles.bar, styles.idle]} accessibilityLiveRegion="polite">
        {intro ? (
          <View style={styles.row}>
            <Icon name="info" size={16} color={colors.cyan} />
            <Text style={styles.intro} numberOfLines={3}>
              {intro}
            </Text>
          </View>
        ) : (
          <View style={[styles.row, { justifyContent: 'flex-end' }]}>
            <Text style={[styles.recLabel, { color: watched ? '#8B94A8' : '#3B4254' }]}>REC</Text>
            <RecDot on={watched} reduced={reducedMotion} />
          </View>
        )}
      </View>
    );
  }

  const look = LOOK[item.speaker];
  return (
    <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={`${look.name}: ${item.text}`} accessibilityHint={item.clueId ? 'Opens what you found' : 'Skips this message'}>
      <Animated.View key={item.key} entering={reducedMotion ? undefined : FadeIn.duration(160)} style={[styles.bar, { borderColor: look.border }]} accessibilityLiveRegion="polite">
        <View style={styles.head}>
          <Text style={[styles.speaker, { color: look.color }]} numberOfLines={1}>
            {item.label ?? look.name}
          </Text>
          {item.speaker === 'WITNESS' && <RecDot on reduced={reducedMotion} />}
          {item.clueId && !typing && <Text style={styles.open}>Tap to read</Text>}
        </View>
        <Text style={[styles.text, { color: item.speaker === 'HALE' || item.speaker === 'PIP' ? colors.text : look.color }]} numberOfLines={3}>
          {text.slice(0, shown)}
          {typing ? '▍' : ''}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: MONITOR_HEIGHT,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: '#080B12E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    gap: 2,
  },
  idle: { borderColor: '#161C2A', backgroundColor: '#070A10B0' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intro: { color: colors.text, flex: 1, fontWeight: '600', fontSize: 13.5, lineHeight: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speaker: { fontFamily: MONO, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, flexShrink: 1, textTransform: 'uppercase' },
  open: { marginLeft: 'auto', color: '#C9A6FF', fontSize: 11, fontWeight: '700' },
  text: { fontSize: 12.5, lineHeight: 16.5, fontWeight: '600' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  recLabel: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
});

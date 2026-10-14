// The Journal: every story beat the player has unlocked, chapter by chapter.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { BeatView } from '../components/StoryCard';
import { Panel } from '../components/ui';
import { CAMPAIGN_SIZE, CHAPTERS, ROOMS_PER_CHAPTER, roomId } from '../game/levels';
import { CHAPTER_STORY, EPILOGUE, ROOM_STORY } from '../game/story';
import { useApp } from '../state/useApp';
import { colors, space, type } from '../theme/theme';

export function JournalScreen() {
  const save = useApp((s) => s.save);
  const insets = useSafeAreaInsets();
  const done = (n: number) => !!save.rooms[roomId(n)]?.completed;
  const unlockedCount = ROOM_STORY.filter((_, i) => done(i + 1)).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        <ScreenHeader title="Journal" showCoins={false} />
        <Text style={styles.dim}>
          {unlockedCount} of {CAMPAIGN_SIZE} entries recovered. Escape rooms to recover more.
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + space.xl, gap: space.lg, paddingTop: space.md }]}>
        {CHAPTERS.map((ch) => {
          const st = CHAPTER_STORY[ch.number - 1];
          const reached = save.story.chaptersSeen.includes(ch.number) || done(ch.firstRoom);
          if (!reached) {
            return (
              <Panel key={ch.number} style={{ opacity: 0.5 }}>
                <Text style={styles.chapterNum}>Chapter {ch.number}</Text>
                <Text style={styles.locked}>Locked</Text>
              </Panel>
            );
          }
          return (
            <Panel key={ch.number} style={{ gap: space.md }}>
              <View>
                <Text style={styles.chapterNum}>
                  Chapter {ch.number} · {st?.location}
                </Text>
                <Text style={styles.title} accessibilityRole="header">
                  {ch.title}
                </Text>
              </View>
              {st?.opening.map((b, i) => <BeatView key={`o${i}`} beat={b} compact />)}
              {Array.from({ length: ROOMS_PER_CHAPTER }, (_, k) => ch.firstRoom + k).map((n) =>
                done(n) ? (
                  <View key={n} style={{ gap: 2 }}>
                    <Text style={styles.roomLabel}>Room {n}</Text>
                    <BeatView beat={ROOM_STORY[n - 1]} compact />
                  </View>
                ) : (
                  <Text key={n} style={styles.missing}>
                    Room {n} · not yet recovered
                  </Text>
                ),
              )}
            </Panel>
          );
        })}
        {save.story.epilogueSeen && (
          <Panel style={{ gap: space.md, borderColor: colors.gold }}>
            <Text style={styles.title}>Epilogue</Text>
            {EPILOGUE.map((b, i) => (
              <BeatView key={i} beat={b} compact />
            ))}
          </Panel>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  dim: { color: colors.textDim, ...type.small, marginTop: space.sm },
  chapterNum: { color: colors.cyan, ...type.tiny, textTransform: 'uppercase' },
  title: { color: colors.text, ...type.h2 },
  locked: { color: colors.textMuted, ...type.body, marginTop: 4 },
  roomLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  missing: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
});

// The Journal: the story so far, and WITNESS Files (every clue, mark and transmission found).
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EyeGlyph } from '../components/board/glyphs';
import { ScreenHeader } from '../components/ScreenHeader';
import { BeatView } from '../components/StoryCard';
import { Button, Panel } from '../components/ui';
import { CAMPAIGN_SIZE, CHAPTERS, ROOMS_PER_CHAPTER, roomId } from '../game/levels';
import { CLUES, SIGIL_COUNT, clueFlag, type Clue } from '../game/observer/clues';
import { evaluate, sigilCount } from '../game/observer/conditions';
import { fillTemplate } from '../game/observer/observer';
import { getInterlude, INTERLUDES, SECRET_ROOM_ID } from '../game/observer/rooms';
import { seenFlag, TRANSMISSIONS } from '../game/observer/script';
import { CHAPTER_STORY, EPILOGUE, ROOM_ARRIVAL, ROOM_STORY } from '../game/story';
import { memoryView } from '../state/memory';
import { useApp } from '../state/useApp';
import { useSession } from '../state/useSession';
import { colors, radius, space, type } from '../theme/theme';
import { clueLabel } from './game/useWitness';

const STORY_CLUES = CLUES.filter((c) => c.kind !== 'sigil');
const SIGILS = CLUES.filter((c) => c.kind === 'sigil');

/** Where a clue lives, in player terms. */
function placeName(roomIdStr: string): string {
  if (roomIdStr.startsWith('o')) return getInterlude(roomIdStr)?.room.name ?? 'Observation Wing';
  return `Room ${Number(roomIdStr.slice(1))}`;
}

export function JournalScreen({ tab = 'story' }: { tab?: 'story' | 'witness' }) {
  const replace = useApp((s) => s.replace);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        <ScreenHeader title="Journal" showCoins={false} />
        <View style={styles.tabs} accessibilityRole="tablist">
          {(
            [
              { id: 'story', label: 'Story' },
              { id: 'witness', label: 'WITNESS Files' },
            ] as const
          ).map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: t.id === tab }}
              onPress={() => replace({ name: 'journal', tab: t.id })}
              style={[styles.tab, t.id === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, t.id === tab && { color: t.id === 'witness' ? colors.witness : colors.cyan }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === 'story' ? <StoryTab /> : <WitnessTab />}
    </View>
  );
}

function StoryTab() {
  const save = useApp((s) => s.save);
  const insets = useSafeAreaInsets();
  const done = (n: number) => !!save.rooms[roomId(n)]?.completed;
  const unlockedCount = ROOM_STORY.filter((_, i) => done(i + 1)).length;
  return (
    <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + space.xl, gap: space.lg, paddingTop: space.sm }]}>
      <Text style={styles.dim}>
        {unlockedCount} of {CAMPAIGN_SIZE} entries recovered. Escape rooms to recover more.
      </Text>
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
            {save.story.chaptersSeen.includes(ch.number) && st?.opening.map((b, i) => <BeatView key={`o${i}`} beat={b} compact />)}
            {Array.from({ length: ROOMS_PER_CHAPTER }, (_, k) => ch.firstRoom + k).map((n) =>
              done(n) ? (
                <View key={n} style={{ gap: 6 }}>
                  <Text style={styles.roomLabel}>Room {n}</Text>
                  {ROOM_ARRIVAL[n - 1] && <BeatView beat={ROOM_ARRIVAL[n - 1]} compact />}
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
  );
}

function WitnessTab() {
  const save = useApp((s) => s.save);
  const navigate = useApp((s) => s.navigate);
  const insets = useSafeAreaInsets();
  const mem = memoryView(save);
  const has = (key: string) => (save.memory.flags[key] ?? 0) > 0;
  const foundStory = STORY_CLUES.filter((c) => has(clueFlag(c.id)));
  // Clues that depend on a choice the player did not make are not counted against them.
  const available = STORY_CLUES.filter((c) => has(clueFlag(c.id)) || evaluate(c.when, mem));
  const sigils = sigilCount(mem);
  const heard = TRANSMISSIONS.filter((t) => has(seenFlag(t.id)));
  const secret = INTERLUDES.find((i) => i.id === SECRET_ROOM_ID)!;
  const secretOpen = sigils >= SIGIL_COUNT;

  const enterSecret = () => {
    useSession.getState().start(secret.room, 'interlude');
    navigate({ name: 'game' });
  };

  return (
    <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + space.xl, gap: space.lg, paddingTop: space.sm }]}>
      <Text style={styles.dim}>
        Things WITNESS left for you to find. None of them are needed to escape, but together they explain who has been watching.
      </Text>

      <Panel style={{ gap: space.md, borderColor: '#3A4152', backgroundColor: '#07080D' }}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.chapterNum, { color: colors.witness }]}>Collection</Text>
            <Text style={styles.title}>{"WITNESS's marks"}</Text>
          </View>
          <Text style={styles.count}>
            {sigils}/{SIGIL_COUNT}
          </Text>
        </View>
        <View style={styles.eyes} accessible accessibilityLabel={`${sigils} of ${SIGIL_COUNT} marks found`}>
          {SIGILS.map((c) => (
            <View key={c.id} style={{ width: '20%', alignItems: 'center', opacity: has(clueFlag(c.id)) ? 1 : 0.25 }}>
              <EyeGlyph s={28} />
              <Text style={styles.eyeRoom}>{has(clueFlag(c.id)) ? placeName(c.room) : '?'}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.dim}>Five marks: the Static trail. All ten: the Observation theme and a room no one else has seen.</Text>
        {secretOpen ? (
          <Button label="Enter the Observation Room" icon="play" variant="primary" onPress={enterSecret} />
        ) : (
          <Text style={styles.missing}>Each chapter hides one mark, usually somewhere off the shortest path.</Text>
        )}
      </Panel>

      <Panel style={{ gap: space.md }}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.chapterNum, { color: '#C9A6FF' }]}>Evidence</Text>
            <Text style={styles.title}>Clues</Text>
          </View>
          <Text style={styles.count}>
            {foundStory.length}/{available.length}
          </Text>
        </View>
        {STORY_CLUES.map((c) =>
          has(clueFlag(c.id)) ? (
            <ClueEntry key={c.id} clue={c} />
          ) : (
            <Text key={c.id} style={styles.missing}>
              {`${placeName(c.room)} · ${evaluate(c.when, mem) ? 'something here is still unread' : 'depends on a choice made elsewhere'}`}
            </Text>
          ),
        )}
      </Panel>

      <Panel style={{ gap: space.md }}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.chapterNum, { color: colors.witness }]}>Monitor log</Text>
            <Text style={styles.title}>Transmissions</Text>
          </View>
          <Text style={styles.count}>{heard.length}</Text>
        </View>
        {heard.length === 0 && <Text style={styles.missing}>Nothing yet. Something on the monitors is waiting for you to move.</Text>}
        {heard.map((t) => (
          <View key={t.id} style={[styles.tx, { borderLeftColor: t.speaker === 'HALE' ? colors.cyan : colors.witness }]}>
            <Text style={[styles.txWho, { color: t.speaker === 'HALE' ? colors.cyan : colors.witness }]}>
              {t.speaker} · {t.room === '*' ? 'anywhere' : placeName(t.room)}
            </Text>
            <Text style={styles.txText}>{fillTemplate(t.text, mem)}</Text>
          </View>
        ))}
      </Panel>
    </ScrollView>
  );
}

function ClueEntry({ clue }: { clue: Clue }) {
  const save = useApp((s) => s.save);
  const related = clue.related.filter((id) => (save.memory.flags[clueFlag(id)] ?? 0) > 0).map((id) => CLUES.find((c) => c.id === id)?.title);
  return (
    <View style={styles.clue}>
      <Text style={styles.clueKicker}>
        {clueLabel(clue)} · {placeName(clue.room)}
      </Text>
      <Text style={styles.clueTitle}>{clue.title}</Text>
      <Text style={[styles.clueText, clue.kind === 'recording' && { fontStyle: 'italic' }]}>{fillTemplate(clue.text, memoryView(save))}</Text>
      {related.length > 0 && <Text style={styles.related}>Connected to: {related.join(', ')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  dim: { color: colors.textDim, ...type.small },
  chapterNum: { color: colors.cyan, ...type.tiny, textTransform: 'uppercase' },
  title: { color: colors.text, ...type.h2 },
  locked: { color: colors.textMuted, ...type.body, marginTop: 4 },
  roomLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  missing: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, gap: 4, marginBottom: space.sm },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  tabActive: { backgroundColor: colors.surfaceHi },
  tabText: { color: colors.textDim, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  count: { color: colors.text, fontWeight: '900', fontSize: 18, fontVariant: ['tabular-nums'] },
  eyes: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  eyeRoom: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  clue: { gap: 3, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  clueKicker: { color: '#C9A6FF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  clueTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  clueText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  related: { color: colors.textMuted, fontSize: 12 },
  tx: { borderLeftWidth: 2, paddingLeft: space.sm, gap: 2 },
  txWho: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  txText: { color: colors.text, fontSize: 14, lineHeight: 20 },
});

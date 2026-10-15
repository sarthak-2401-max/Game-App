import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewardedOffer } from '../components/ads/RewardedOffer';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Panel, ProgressBar } from '../components/ui';
import { ECONOMY } from '../config/economy';
import { adService } from '../services/ads/adService';
import { BONUS_ROOMS } from '../game/daily/catalog';
import { CAMPAIGN, CHAPTERS, ROOMS_PER_CHAPTER, roomId } from '../game/levels';
import type { Room } from '../game/types';
import { chapterProgress, completedCount, continueRoom, isRoomUnlocked, unlockBonusRoomWithCoins } from '../state/progression';
import { useApp } from '../state/useApp';
import { useSession } from '../state/useSession';
import { useToast } from '../state/useToast';
import { CHAPTER_STORY } from '../game/story';
import { chapterPalette } from '../theme/chapters';
import { colors, radius, space, type } from '../theme/theme';
import { StarIcon, StarRow } from '../components/game/Stars';
import { EyeGlyph } from '../components/board/glyphs';
import { CLUES, SIGIL_COUNT, clueFlag } from '../game/observer/clues';
import { INTERLUDES, SECRET_ROOM_ID } from '../game/observer/rooms';
import { MAX_STARS, starCount, totalStars } from '../state/mastery';
import { memoryView } from '../state/memory';
import { sigilCount } from '../game/observer/conditions';

/** Completed campaign rooms needed before the Bonus Vault opens. */
const VAULT_REQUIREMENT = 10;

export function LevelSelectScreen() {
  const save = useApp((s) => s.save);
  const navigate = useApp((s) => s.navigate);
  const update = useApp((s) => s.update);
  const toast = useToast((s) => s.show);
  const insets = useSafeAreaInsets();
  const { offer, sheet } = useRewardedOffer();
  const current = continueRoom(save);
  const done = completedCount(save);

  const stars = totalStars(save);
  const sigils = sigilCount(memoryView(save));
  const chapterStars = (first: number) => CAMPAIGN.slice(first - 1, first - 1 + ROOMS_PER_CHAPTER).reduce((n, r) => n + starCount(save.rooms[r.id]?.stars), 0);
  const chapterSigil = (first: number) => CLUES.find((c) => c.kind === 'sigil' && Number(c.room.slice(1)) >= first && Number(c.room.slice(1)) < first + ROOMS_PER_CHAPTER);
  // Interludes show once the player has reached them; the secret room once all marks are found.
  const wing = INTERLUDES.filter((i) =>
    i.id === SECRET_ROOM_ID ? sigils >= SIGIL_COUNT || !!save.rooms[i.id]?.completed : !!save.rooms[roomId(i.after)]?.completed || !!save.rooms[i.id]?.completed,
  );

  const open = (room: Room, kind: 'campaign' | 'bonus' | 'interlude') => {
    useSession.getState().start(room, kind);
    navigate({ name: 'game' });
  };

  const chapters = useMemo(
    () => CHAPTERS.map((c) => ({ info: c, rooms: CAMPAIGN.slice(c.firstRoom - 1, c.firstRoom - 1 + ROOMS_PER_CHAPTER) })),
    [],
  );

  const vaultOpen = done >= VAULT_REQUIREMENT;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        <ScreenHeader title="Rooms" />
        <View style={styles.summary}>
          <View style={styles.summaryItem} accessible accessibilityLabel={`${stars} of ${MAX_STARS} stars`}>
            <StarIcon size={16} on />
            <Text style={styles.summaryText}>
              {stars}
              <Text style={styles.summaryDim}> / {MAX_STARS}</Text>
            </Text>
          </View>
          <View style={styles.summaryItem} accessible accessibilityLabel={`${sigils} of ${SIGIL_COUNT} WITNESS marks found`}>
            <EyeGlyph s={22} />
            <Text style={styles.summaryText}>
              {sigils}
              <Text style={styles.summaryDim}> / {SIGIL_COUNT} marks</Text>
            </Text>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + space.xl, gap: space.lg }]}>
        {chapters.map(({ info, rooms }) => {
          const progress = chapterProgress(save, info.number);
          const locked = !isRoomUnlocked(save, info.firstRoom);
          const pal = chapterPalette(info.number);
          return (
            <Panel key={info.number} style={[{ gap: space.md, borderColor: locked ? colors.border : `${pal.glow}55`, backgroundColor: locked ? colors.surface : pal.bg }, locked && { opacity: 0.55 }]}>
              <View style={styles.chapterHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chapterNum, { color: pal.glow }]}>
                    Chapter {info.number}
                    {!locked && CHAPTER_STORY[info.number - 1] ? ` · ${CHAPTER_STORY[info.number - 1].location}` : ''}
                  </Text>
                  <Text style={styles.chapterTitle} accessibilityRole="header">
                    {info.title}
                  </Text>
                  <Text style={styles.dim}>{info.blurb}</Text>
                </View>
                {locked ? (
                  <Icon name="lock" size={22} color={colors.textMuted} />
                ) : (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={styles.summaryItem}>
                      <StarIcon size={13} on />
                      <Text style={styles.chapterStars}>{chapterStars(info.firstRoom)}/30</Text>
                    </View>
                    {(() => {
                      const sg = chapterSigil(info.firstRoom);
                      const got = !!sg && (save.memory.flags[clueFlag(sg.id)] ?? 0) > 0;
                      return sg ? (
                        <View style={{ opacity: got ? 1 : 0.3 }} accessible accessibilityLabel={got ? "This chapter's mark: found" : "This chapter's mark: not found yet"}>
                          <EyeGlyph s={20} />
                        </View>
                      ) : null;
                    })()}
                  </View>
                )}
              </View>
              <ProgressBar value={progress} max={ROOMS_PER_CHAPTER} color={progress === ROOMS_PER_CHAPTER ? colors.success : colors.cyan} />
              <View style={styles.grid}>
                {rooms.map((room) => (
                  <RoomTile
                    key={room.id}
                    room={room}
                    unlocked={isRoomUnlocked(save, room.index)}
                    completed={!!save.rooms[roomId(room.index)]?.completed}
                    current={room.index === current}
                    best={save.rooms[roomId(room.index)]?.bestMoves}
                    stars={save.rooms[roomId(room.index)]?.stars ?? 0}
                    onPress={() => open(room, 'campaign')}
                  />
                ))}
              </View>
            </Panel>
          );
        })}

        {wing.length > 0 && (
          <Panel style={{ gap: space.md, borderColor: '#3A4152', backgroundColor: '#07080D' }}>
            <View style={styles.chapterHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chapterNum, { color: colors.witness }]}>WITNESS</Text>
                <Text style={styles.chapterTitle} accessibilityRole="header">
                  Observation Wing
                </Text>
                <Text style={styles.dim}>Short scenes between chapters. Replay them any time.</Text>
              </View>
              <EyeGlyph s={28} />
            </View>
            {wing.map((i) => {
              const rec = save.rooms[i.id];
              return (
                <View key={i.id} style={styles.bonusRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.bonusName}>{i.room.name}</Text>
                    <Text style={styles.dim}>{i.blurb}</Text>
                    {rec?.completed && <StarRow mask={rec.stars ?? 1} size={12} />}
                  </View>
                  <Button label={rec?.completed ? 'Replay' : 'Play'} icon="play" variant={rec?.completed ? 'secondary' : 'primary'} onPress={() => open(i.room, 'interlude')} />
                </View>
              );
            })}
          </Panel>
        )}

        <Panel style={{ gap: space.md, borderColor: colors.amberDim }}>
          <View style={styles.chapterHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chapterNum, { color: colors.amber }]}>Extra</Text>
              <Text style={styles.chapterTitle} accessibilityRole="header">
                Bonus Vault
              </Text>
              <Text style={styles.dim}>
                {vaultOpen
                  ? `Three extra rooms. Unlock each for ${ECONOMY.bonusRoomPrice} coins${adService.hasProvider ? ' or by watching an optional ad' : ''}.`
                  : `Complete ${VAULT_REQUIREMENT} campaign rooms to open the vault (${done}/${VAULT_REQUIREMENT}).`}
              </Text>
            </View>
            <Icon name={vaultOpen ? 'gift' : 'lock'} size={22} color={vaultOpen ? colors.amber : colors.textMuted} />
          </View>
          {vaultOpen &&
            BONUS_ROOMS.map((room) => {
              const unlocked = save.bonusRoomsUnlocked.includes(room.id);
              const cleared = !!save.rooms[room.id]?.completed;
              return (
                <View key={room.id} style={styles.bonusRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bonusName}>
                      {room.name} {cleared ? '✓' : ''}
                    </Text>
                    <Text style={styles.dim}>{room.tags.slice(0, 3).join(' · ')}</Text>
                  </View>
                  {unlocked ? (
                    <Button label="Play" icon="play" variant="primary" onPress={() => open(room, 'bonus')} />
                  ) : (
                    <View style={{ gap: 6 }}>
                      <Button
                        label={`${ECONOMY.bonusRoomPrice}`}
                        icon="coin"
                        variant="reward"
                        disabled={save.coins < ECONOMY.bonusRoomPrice}
                        onPress={() => {
                          const r = unlockBonusRoomWithCoins(useApp.getState().save, room.id);
                          if (r.ok) {
                            update(() => r.save);
                            toast(`${room.name} unlocked.`, 'success');
                          }
                        }}
                      />
                      {adService.hasProvider && (
                      <Button
                        label="Watch ad"
                        icon="video"
                        variant="secondary"
                        onPress={() =>
                          offer({
                            placement: 'bonus_room',
                            title: 'Unlock a bonus room',
                            benefit: `Unlock ${room.name} permanently.`,
                            grantOpts: { bonusRoomId: room.id },
                            onGranted: () => undefined,
                          })
                        }
                      />
                      )}
                    </View>
                  )}
                </View>
              );
            })}
        </Panel>
      </ScrollView>
      {sheet}
    </View>
  );
}

function RoomTile({ room, unlocked, completed, current, best, stars, onPress }: { room: Room; unlocked: boolean; completed: boolean; current: boolean; best?: number; stars: number; onPress: () => void }) {
  const state = !unlocked ? 'locked' : completed ? 'completed' : current ? 'current' : 'open';
  const label = `Room ${room.index}, ${room.name}. ${state === 'locked' ? 'Locked' : state === 'completed' ? `Completed${best ? ` in ${best} moves` : ''}, ${starCount(stars)} of 3 stars` : state === 'current' ? 'Next to play' : 'Unlocked'}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !unlocked }}
      disabled={!unlocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        state === 'completed' && { borderColor: '#1F5E45', backgroundColor: '#0D1E18' },
        state === 'current' && { borderColor: colors.cyan, backgroundColor: '#0B1E26', borderWidth: 2 },
        state === 'locked' && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {state === 'locked' ? (
        <Icon name="lock" size={16} color={colors.textMuted} />
      ) : (
        <Text style={[styles.tileNum, state === 'current' && { color: colors.cyan }]}>{room.index}</Text>
      )}
      {state === 'completed' && <StarRow mask={stars || 1} size={9} />}
      {state === 'current' && <Text style={styles.tileTag}>NEXT</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  chapterHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  chapterNum: { color: colors.cyan, ...type.tiny, textTransform: 'uppercase' },
  chapterTitle: { color: colors.text, ...type.h2 },
  dim: { color: colors.textDim, ...type.small },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '18%',
    flexGrow: 1,
    aspectRatio: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tileNum: { color: colors.text, fontWeight: '900', fontSize: 17, fontVariant: ['tabular-nums'] },
  tileTag: { color: colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  bonusName: { color: colors.text, fontWeight: '800', fontSize: 16 },
  summary: { flexDirection: 'row', gap: space.lg, marginTop: space.sm, marginBottom: space.md },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { color: colors.text, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] },
  summaryDim: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  chapterStars: { color: colors.gold, fontWeight: '800', fontSize: 12, fontVariant: ['tabular-nums'] },
});

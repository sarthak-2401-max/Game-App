import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Ambient } from '../components/Ambient';
import { RoomPreview } from '../components/RoomPreview';
import { chapterPalette } from '../theme/chapters';
import { Button, CoinBadge, IconButton, Panel, ProgressBar, Pulse } from '../components/ui';
import { APP } from '../config/app';
import { ECONOMY } from '../config/economy';
import { dailyRoomFor } from '../game/daily/daily';
import { CAMPAIGN_SIZE, chapterOf, getRoom } from '../game/levels';
import { completedCount, continueRoom, liveStreak } from '../state/progression';
import { useApp } from '../state/useApp';
import { useSession } from '../state/useSession';
import { colors, radius, space, type } from '../theme/theme';
import { dayKey } from '../utils/dates';

export function HomeScreen() {
  const save = useApp((s) => s.save);
  const navigate = useApp((s) => s.navigate);
  const notice = useApp((s) => s.notice);
  const dismissNotice = useApp((s) => s.dismissNotice);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const today = dayKey();
  const done = completedCount(save);
  const next = continueRoom(save);
  const nextChapter = chapterOf(next);
  const fresh = done === 0;
  const allDone = done >= CAMPAIGN_SIZE;
  const daily = dailyRoomFor(today);
  const dailyClaimed = !!save.daily.claims[today];
  const streak = liveStreak(save, today);

  const play = () => {
    const room = getRoom(next);
    if (!room) return;
    useSession.getState().start(room, 'campaign');
    navigate({ name: 'game' });
  };
  const playDaily = () => {
    useSession.getState().start(daily, 'daily', today);
    navigate({ name: 'game' });
  };

  const previewWidth = Math.min(width - 64, 300);

  return (
    <View style={styles.root}>
    <Ambient color={nextChapter ? chapterPalette(nextChapter.number).glow : colors.cyan} cy={0.32} strength={0.2} />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.topRow}>
        <CoinBadge coins={save.coins} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <IconButton icon="trophy" label="Rewards and achievements" onPress={() => navigate({ name: 'rewards', tab: 'shop' })} />
          <IconButton icon="gear" label="Settings" onPress={() => navigate({ name: 'settings' })} />
        </View>
      </View>

      {notice ? (
        <Pressable onPress={dismissNotice} accessibilityRole="button" accessibilityHint="Dismisses this notice" style={styles.notice}>
          <Icon name="info" size={18} color={colors.amber} />
          <Text style={styles.noticeText}>{notice}</Text>
          <Icon name="close" size={16} color={colors.textDim} />
        </Pressable>
      ) : null}

      <Animated.View entering={FadeIn.duration(500)} style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          ONE ROOM <Text style={{ color: colors.cyan }}>LEFT</Text>
        </Text>
        <Text style={styles.tagline}>{APP.tagline}</Text>
      </Animated.View>

      <View style={styles.preview} accessible accessibilityLabel="Animated preview of a room being solved" importantForAccessibility="no-hide-descendants">
        <RoomPreview width={previewWidth} look={save.cosmetics.selected} reducedMotion={save.settings.reducedMotion} />
      </View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={{ gap: space.md }}>
        <Pulse enabled={fresh && !save.settings.reducedMotion}>
          <Button
            testID="play"
            label={fresh ? 'Play' : allDone ? 'Replay the final room' : `Continue · Room ${next}`}
            sublabel={fresh ? 'Start with room 1' : nextChapter ? `Chapter ${nextChapter.number}: ${nextChapter.title}` : undefined}
            variant="primary"
            icon="play"
            onPress={play}
          />
        </Pulse>

        <Panel style={{ gap: space.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Campaign</Text>
            <Text style={styles.value}>
              {done} / {CAMPAIGN_SIZE} rooms
            </Text>
          </View>
          <ProgressBar value={done} max={CAMPAIGN_SIZE} />
        </Panel>

        {!fresh && (
          <Panel style={[{ gap: space.sm }, !dailyClaimed && { borderColor: colors.amberDim }]}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Icon name="calendar" size={20} color={colors.amber} />
                <Text style={styles.label}>Daily Challenge</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }} accessible accessibilityLabel={`Streak: ${streak} days`}>
                <Icon name="flame" size={16} color={streak ? colors.amber : colors.textMuted} />
                <Text style={[styles.value, { color: streak ? colors.amber : colors.textMuted }]}>{streak}</Text>
              </View>
            </View>
            <Text style={styles.dim}>
              {dailyClaimed ? `Done for today. A new room unlocks tomorrow.` : `${daily.name}. Earn ${ECONOMY.dailyReward} coins plus a streak bonus.`}
            </Text>
            <Button label={dailyClaimed ? 'Play again (no reward)' : 'Play today’s room'} icon={dailyClaimed ? 'check' : 'play'} variant={dailyClaimed ? 'secondary' : 'reward'} onPress={playDaily} />
          </Panel>
        )}

        <View style={styles.navRow}>
          <NavTile icon="grid" label="Rooms" onPress={() => navigate({ name: 'levels' })} />
          <NavTile icon="gift" label="Shop" onPress={() => navigate({ name: 'rewards', tab: 'shop' })} />
          <NavTile icon="book" label="Journal" onPress={() => navigate({ name: 'journal' })} />
          <NavTile icon="trophy" label="Awards" onPress={() => navigate({ name: 'rewards', tab: 'achievements' })} />
        </View>
      </Animated.View>
    </ScrollView>
    </View>
  );
}

function NavTile({ icon, label, onPress }: { icon: 'grid' | 'gift' | 'trophy' | 'book'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.navTile, pressed && { opacity: 0.75 }]}>
      <Icon name={icon} size={24} color={colors.cyan} />
      <Text style={styles.navLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', borderColor: colors.amberDim, borderWidth: 1, backgroundColor: '#1B160C', borderRadius: radius.md, padding: space.md },
  noticeText: { color: colors.text, flex: 1, ...type.small },
  titleBlock: { alignItems: 'center', gap: 6, marginTop: space.sm },
  title: { color: colors.text, ...type.title, textAlign: 'center' },
  tagline: { color: colors.textDim, ...type.body, textAlign: 'center' },
  preview: { alignItems: 'center', paddingVertical: space.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.text, ...type.h2 },
  value: { color: colors.textDim, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dim: { color: colors.textDim, ...type.small },
  navRow: { flexDirection: 'row', gap: space.sm },
  navTile: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: space.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, minHeight: 72, justifyContent: 'center' },
  navLabel: { color: colors.text, fontWeight: '700' },
});

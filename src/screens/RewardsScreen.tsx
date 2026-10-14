import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewardedOffer } from '../components/ads/RewardedOffer';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Panel, ProgressBar, SectionTitle } from '../components/ui';
import { ACHIEVEMENTS, getAchievement } from '../config/achievements';
import { COSMETICS, type Cosmetic, type CosmeticSlot } from '../config/cosmetics';
import { ECONOMY } from '../config/economy';
import { POWERUPS } from '../config/powerups';
import { buyPowerUp, powerUpCount } from '../state/powerups';
import { dailyRoomFor } from '../game/daily/daily';
import { adService } from '../services/ads/adService';
import { analytics } from '../services/analytics/analytics';
import { liveStreak, purchaseCosmetic, rewardedUsesLeft, selectCosmetic } from '../state/progression';
import { useApp, type RewardsTab } from '../state/useApp';
import { useSession } from '../state/useSession';
import { useToast } from '../state/useToast';
import { colors, radius, space, type } from '../theme/theme';
import { dayKey, daysBetween } from '../utils/dates';

const TABS: { id: RewardsTab; label: string }[] = [
  { id: 'shop', label: 'Shop' },
  { id: 'achievements', label: 'Awards' },
  { id: 'daily', label: 'Daily' },
  { id: 'coins', label: 'Coins' },
];

const SLOT_NAMES: Record<CosmeticSlot, string> = {
  skin: 'Character',
  trail: 'Trail',
  theme: 'Room theme',
  exit: 'Exit style',
  tile: 'Floor pattern',
  victory: 'Victory effect',
};

export function RewardsScreen({ tab }: { tab: RewardsTab }) {
  const replace = useApp((s) => s.replace);
  const insets = useSafeAreaInsets();
  // Offer sheets are overlays, so they render at the screen root, not inside the scroll view.
  const { offer, sheet } = useRewardedOffer();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        <ScreenHeader title="Rewards" />
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: t.id === tab }}
              onPress={() => replace({ name: 'rewards', tab: t.id })}
              style={[styles.tab, t.id === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, t.id === tab && { color: colors.cyan }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + space.xl, gap: space.md }]}>
        {tab === 'shop' && <Shop offer={offer} />}
        {tab === 'achievements' && <Achievements />}
        {tab === 'daily' && <Daily />}
        {tab === 'coins' && <Coins offer={offer} />}
      </ScrollView>
      {sheet}
    </View>
  );
}

function PowerUpShop({ offer }: { offer: Offer }) {
  const save = useApp((s) => s.save);
  const update = useApp((s) => s.update);
  const toast = useToast((s) => s.show);
  const adsLeft = rewardedUsesLeft(save, 'powerup', dayKey());
  return (
    <View>
      <SectionTitle>Power-ups</SectionTitle>
      <View style={{ gap: space.sm }}>
        {POWERUPS.map((p) => {
          const unlocked = save.powerups.unlocked.includes(p.id);
          const n = powerUpCount(save, p.id);
          return (
            <View key={p.id} style={[styles.item, !unlocked && { opacity: 0.6 }]}>
              <View style={[styles.puIcon, { borderColor: p.color }]}>
                <Icon name={unlocked ? p.icon : 'lock'} size={24} color={unlocked ? p.color : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {p.name}
                  {unlocked ? <Text style={{ color: p.color }}>{`  ×${n}`}</Text> : null}
                </Text>
                <Text style={styles.dim}>{unlocked ? p.description : `Unlocks after room ${p.unlockAfterRoom}.`}</Text>
              </View>
              {unlocked && (
                <View style={{ gap: 6 }}>
                  <Button
                    label={`${p.coinPrice}`}
                    icon="coin"
                    variant="reward"
                    disabled={save.coins < p.coinPrice}
                    onPress={() => {
                      const r = buyPowerUp(useApp.getState().save, p.id);
                      if (r.ok) {
                        update(() => r.save);
                        analytics.track('powerup_purchased', { powerup: p.id, currency: 'coins' });
                        toast(`${p.name} added.`, 'success');
                      }
                    }}
                  />
                  {adService.hasProvider && adsLeft > 0 && (
                    <Button
                      label="Free"
                      icon="video"
                      onPress={() => offer({ placement: 'powerup', title: `Free ${p.name}`, benefit: `Get 1 ${p.name} for your inventory.`, grantOpts: { powerUpId: p.id }, onGranted: () => undefined })}
                    />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Shop({ offer }: { offer: Offer }) {
  const save = useApp((s) => s.save);
  const update = useApp((s) => s.update);
  const toast = useToast((s) => s.show);
  const slots = Object.keys(SLOT_NAMES) as CosmeticSlot[];

  const buy = (c: Cosmetic) => {
    const r = purchaseCosmetic(useApp.getState().save, c.id);
    if (r.ok) {
      update(() => selectCosmetic(r.save, c.id));
      analytics.track('cosmetic_unlocked', { id: c.id, slot: c.slot, price: c.price });
      toast(`${c.name} unlocked and equipped.`, 'success');
      for (const a of r.achievements) {
        analytics.track('achievement_unlocked', { id: a });
        toast(`Achievement: ${getAchievement(a)?.name ?? a}`, 'success');
      }
    } else if (r.reason === 'insufficient') {
      toast(`You need ${c.price - save.coins} more coins.`, 'warn');
    }
  };

  return (
    <>
      <PowerUpShop offer={offer} />
      <Text style={styles.dim}>Cosmetics only change how things look. Hazards always keep their colours and shapes.</Text>
      {slots.map((slot) => (
        <View key={slot}>
          <SectionTitle>{SLOT_NAMES[slot]}</SectionTitle>
          <View style={{ gap: space.sm }}>
            {COSMETICS.filter((c) => c.slot === slot).map((c) => {
              const owned = save.cosmetics.owned.includes(c.id);
              const equipped = save.cosmetics.selected[slot] === c.id;
              const ach = c.achievement ? getAchievement(c.achievement) : undefined;
              return (
                <View key={c.id} style={[styles.item, equipped && { borderColor: colors.cyan }]}>
                  <Swatch c={c} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{c.name}</Text>
                    <Text style={styles.dim}>{ach && !owned ? `Earn “${ach.name}”: ${ach.description}` : c.description}</Text>
                  </View>
                  {equipped ? (
                    <View style={styles.equipped} accessible accessibilityLabel="Equipped">
                      <Icon name="check" size={16} color={colors.cyan} />
                    </View>
                  ) : owned ? (
                    <Button label="Equip" onPress={() => update((s) => selectCosmetic(s, c.id))} />
                  ) : ach ? (
                    <Icon name="lock" size={20} color={colors.textMuted} />
                  ) : (
                    <Button label={String(c.price)} icon="coin" variant="reward" disabled={save.coins < c.price} onPress={() => buy(c)} accessibilityHint={`Buy ${c.name} for ${c.price} coins`} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}

function Swatch({ c }: { c: Cosmetic }) {
  const color = String(c.look.color ?? c.look.wallEdge ?? colors.cyan);
  const bg = String(c.look.floor ?? colors.surfaceHi);
  return (
    <View style={[styles.swatch, { backgroundColor: bg }]} importantForAccessibility="no">
      {c.slot === 'theme' ? (
        <View style={{ width: 20, height: 20, backgroundColor: String(c.look.wall), borderColor: color, borderWidth: 2, borderRadius: 4 }} />
      ) : c.slot === 'skin' || c.slot === 'trail' ? (
        <View style={{ width: 18, height: 18, borderRadius: c.look.shape === 'square' ? 3 : 9, backgroundColor: color === 'transparent' ? colors.border : color, transform: c.look.shape === 'diamond' ? [{ rotate: '45deg' }] : [] }} />
      ) : (
        <Icon name={c.slot === 'exit' ? 'play' : c.slot === 'victory' ? 'star' : 'grid'} size={20} color={colors.cyan} />
      )}
    </View>
  );
}

function Achievements() {
  const save = useApp((s) => s.save);
  const unlocked = ACHIEVEMENTS.filter((a) => save.achievements[a.id]?.unlockedAt).length;
  return (
    <>
      <Text style={styles.dim}>
        {unlocked} of {ACHIEVEMENTS.length} unlocked
      </Text>
      {ACHIEVEMENTS.map((a) => {
        const rec = save.achievements[a.id];
        const done = !!rec?.unlockedAt;
        const secret = a.hidden && !done;
        return (
          <Panel key={a.id} style={[{ gap: 6 }, done && { borderColor: '#5A4A1A' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Icon name={done ? 'trophy' : 'lock'} size={22} color={done ? colors.gold : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{secret ? 'Hidden achievement' : a.name}</Text>
                <Text style={styles.dim}>{secret ? 'Keep playing to discover it.' : a.description}</Text>
              </View>
              <Text style={styles.reward}>+{a.reward}</Text>
            </View>
            {!done && a.target > 1 && <ProgressBar value={rec?.progress ?? 0} max={a.target} color={colors.amber} height={4} />}
          </Panel>
        );
      })}
    </>
  );
}

function Daily() {
  const save = useApp((s) => s.save);
  const navigate = useApp((s) => s.navigate);
  const today = dayKey();
  const streak = liveStreak(save, today);
  const claimed = !!save.daily.claims[today];
  const room = dailyRoomFor(today);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return { key, done: !!save.daily.claims[key], label: d.toLocaleDateString(undefined, { weekday: 'narrow' }) };
  });
  const lastDay = save.daily.streak.lastDay;
  const graceUsed = !!lastDay && !claimed && daysBetween(lastDay, today) === 2;

  return (
    <>
      <Panel style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Icon name="flame" size={32} color={streak ? colors.amber : colors.textMuted} />
          <View>
            <Text style={styles.big}>{streak}-day streak</Text>
            <Text style={styles.dim}>Best: {save.daily.streak.best} days</Text>
          </View>
        </View>
        <View style={styles.week}>
          {last7.map((d) => (
            <View key={d.key} style={styles.dayCol} accessible accessibilityLabel={`${d.key}: ${d.done ? 'completed' : 'not completed'}`}>
              <View style={[styles.dayDot, d.done && { backgroundColor: colors.amber, borderColor: colors.amber }]}>{d.done && <Icon name="check" size={12} color="#1A1205" />}</View>
              <Text style={styles.dayLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.dim}>
          Each day adds {ECONOMY.streak.bonusPerDay} bonus coins, up to {ECONOMY.streak.maxBonus}. Miss one day and your streak is safe; miss two and it starts over.
        </Text>
        {graceUsed && <Text style={[styles.dim, { color: colors.amber }]}>You missed yesterday. Play today to keep your streak.</Text>}
      </Panel>
      <Panel style={{ gap: space.md }}>
        <Text style={styles.itemName}>Today: {room.name}</Text>
        <Text style={styles.dim}>{claimed ? 'Completed. Come back tomorrow for a new room.' : `Reward: ${ECONOMY.dailyReward} coins + streak bonus.`}</Text>
        <Button
          label={claimed ? 'Play again (no reward)' : 'Play today’s room'}
          icon="play"
          variant={claimed ? 'secondary' : 'reward'}
          onPress={() => {
            useSession.getState().start(room, 'daily', today);
            navigate({ name: 'game' });
          }}
        />
      </Panel>
    </>
  );
}

type Offer = ReturnType<typeof useRewardedOffer>['offer'];

function Coins({ offer }: { offer: Offer }) {
  const save = useApp((s) => s.save);
  const left = rewardedUsesLeft(save, 'bonus_coins', dayKey());
  return (
    <>
      <Panel style={{ gap: space.md, alignItems: 'center' }}>
        <Icon name="coin" size={40} />
        <Text style={styles.big}>{save.coins} Escape Coins</Text>
        <Text style={[styles.dim, { textAlign: 'center' }]}>Earn coins by escaping rooms for the first time, finding hidden collectibles, finishing chapters, daily challenges and achievements.</Text>
      </Panel>
      {adService.hasProvider && (
      <Panel style={{ gap: space.md }}>
        <Text style={styles.itemName}>Free coins</Text>
        <Text style={styles.dim}>Watch an optional short ad for {ECONOMY.ads.bonusCoins} coins. {left} left today.</Text>
        <Button
          label="Get free coins"
          icon="video"
          variant="reward"
          disabled={left <= 0}
          sublabel={left <= 0 ? 'Come back tomorrow' : undefined}
          onPress={() => offer({ placement: 'bonus_coins', title: 'Free coins', benefit: `Get ${ECONOMY.ads.bonusCoins} Escape Coins.`, onGranted: () => undefined })}
        />
      </Panel>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  puIcon: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHi },
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 4, borderWidth: 1, borderColor: colors.border, marginBottom: space.md },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  tabActive: { backgroundColor: colors.surfaceHi },
  tabText: { color: colors.textDim, fontWeight: '800' },
  dim: { color: colors.textDim, ...type.small },
  big: { color: colors.text, ...type.h1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: space.md },
  itemName: { color: colors.text, fontWeight: '800', fontSize: 16 },
  swatch: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  equipped: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  reward: { color: colors.amber, fontWeight: '900' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  dayDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
});

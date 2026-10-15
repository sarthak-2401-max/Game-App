// Mastery stars: a compact row for room tiles, and a labelled checklist for the result card.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { STAR_ESCAPE, STAR_MOVES, STAR_OBJECTIVE, type StarCriteria } from '../../state/mastery';
import { colors } from '../../theme/theme';

const STAR_POINTS = (s: number) => {
  const c = s / 2;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.48 : s * 0.2;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${c + r * Math.cos(a)},${c + r * Math.sin(a)}`);
  }
  return pts.join(' ');
};

export function StarIcon({ size, on, color = colors.gold }: { size: number; on: boolean; color?: string }) {
  return (
    <Svg width={size} height={size}>
      <Polygon points={STAR_POINTS(size)} fill={on ? color : 'none'} stroke={on ? color : '#4A5470'} strokeWidth={1.2} />
    </Svg>
  );
}

const BITS = [STAR_ESCAPE, STAR_MOVES, STAR_OBJECTIVE];

/** Three small stars for a bitmask (room tiles, daily card). */
export function StarRow({ mask, size = 10 }: { mask: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessible accessibilityLabel={`${BITS.filter((b) => mask & b).length} of 3 stars`}>
      {BITS.map((b) => (
        <StarIcon key={b} size={size} on={(mask & b) !== 0} />
      ))}
    </View>
  );
}

/** The result card checklist: which stars this run earned, which are new, which remain. */
export function StarChecklist({ stars, prev, criteria, reduced }: { stars: number; prev: number; criteria: StarCriteria; reduced: boolean }) {
  const best = stars | prev;
  const rows = [
    { bit: STAR_ESCAPE, label: 'Escape' },
    { bit: STAR_MOVES, label: `Escape in ${criteria.movesTarget} moves or fewer` },
    { bit: STAR_OBJECTIVE, label: criteria.objectiveLabel },
  ];
  return (
    <View style={styles.box}>
      <View style={styles.big}>
        {rows.map((r, i) => (
          <Animated.View key={r.bit} entering={reduced ? undefined : ZoomIn.delay(150 + i * 140).duration(260)}>
            <StarIcon size={30} on={(best & r.bit) !== 0} />
          </Animated.View>
        ))}
      </View>
      {rows.map((r) => {
        const now = (stars & r.bit) !== 0;
        const isNew = now && (prev & r.bit) === 0;
        const had = (prev & r.bit) !== 0;
        return (
          <View key={r.bit} style={styles.row} accessible accessibilityLabel={`${r.label}: ${now || had ? 'earned' : 'not yet'}`}>
            <StarIcon size={13} on={now || had} />
            <Text style={[styles.label, !(now || had) && styles.todo]}>{r.label}</Text>
            {isNew && <Text style={styles.new}>NEW</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4, alignItems: 'stretch' },
  big: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  todo: { color: colors.textMuted },
  new: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});

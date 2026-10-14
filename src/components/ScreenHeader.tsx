import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/useApp';
import { colors, space, type } from '../theme/theme';
import { CoinBadge, IconButton } from './ui';

export function ScreenHeader({ title, showCoins = true }: { title: string; showCoins?: boolean }) {
  const back = useApp((s) => s.back);
  const coins = useApp((s) => s.save.coins);
  return (
    <View style={styles.row}>
      <IconButton icon="back" label="Back" onPress={back} />
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {showCoins ? <CoinBadge coins={coins} compact /> : <View style={{ width: 48 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  title: { flex: 1, color: colors.text, ...type.h1 },
});

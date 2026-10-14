// In-room power-up buttons. Shows only unlocked power-ups, each with its remaining count.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { POWERUPS, type PowerUpId } from '../../config/powerups';
import type { SaveData } from '../../services/storage/saveSchema';
import { colors, radius } from '../../theme/theme';
import { Icon } from '../Icon';

export function PowerUpBar({ save, active, disabled, onPress }: { save: SaveData; active: Partial<Record<PowerUpId, boolean>>; disabled: boolean; onPress: (id: PowerUpId) => void }) {
  const unlocked = POWERUPS.filter((p) => save.powerups.unlocked.includes(p.id));
  if (!unlocked.length) return null;
  return (
    <View style={styles.row}>
      {unlocked.map((p) => {
        const n = save.powerups.inventory[p.id] ?? 0;
        const on = !!active[p.id];
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.name}, ${n} left${on ? ', active' : ''}`}
            accessibilityHint={p.description}
            disabled={disabled}
            onPress={() => onPress(p.id)}
            style={({ pressed }) => [
              styles.btn,
              { borderColor: on ? p.color : colors.border, backgroundColor: on ? `${p.color}26` : colors.surface },
              (disabled || pressed) && { opacity: disabled ? 0.45 : 0.75 },
            ]}
          >
            <Icon name={p.icon} size={22} color={p.color} />
            <View style={[styles.badge, { backgroundColor: n > 0 ? p.color : colors.surfaceHi }]}>
              <Text style={[styles.badgeText, { color: n > 0 ? '#06121A' : colors.textDim }]}>{n > 0 ? n : '+'}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  btn: { width: 50, height: 50, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 11, fontWeight: '900' },
});

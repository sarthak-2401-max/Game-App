// On-screen controller: four direction keys (and Wait in clocked rooms) on a round console that
// takes the chapter's light colour. Large targets, a visible press state and a tap sound.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Action } from '../../game/types';
import { sound } from '../../services/audio/sound';
import { colors } from '../../theme/theme';
import { Icon, type IconName } from '../Icon';

const KEY = 60;

function Key({ icon, label, onPress, disabled, glow }: { icon: IconName; label: string; onPress: () => void; disabled: boolean; glow: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPressIn={() => sound.play('tap')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        { borderColor: pressed ? glow : `${glow}40`, backgroundColor: pressed ? `${glow}33` : '#121828', opacity: disabled ? 0.35 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
    >
      <View style={[styles.keyTop, { backgroundColor: `${glow}14` }]} />
      <Icon name={icon} size={KEY * 0.44} color={colors.text} />
    </Pressable>
  );
}

export function DPad({ onAction, disabled, canWait, glow }: { onAction: (a: Action) => void; disabled: boolean; canWait: boolean; glow: string }) {
  return (
    <View style={[styles.base, { borderColor: `${glow}26`, shadowColor: glow }]}>
      <View style={styles.row}>
        <Key icon="up" label="Move up" glow={glow} disabled={disabled} onPress={() => onAction('up')} />
      </View>
      <View style={styles.row}>
        <Key icon="left" label="Move left" glow={glow} disabled={disabled} onPress={() => onAction('left')} />
        {canWait ? <Key icon="wait" label="Wait one turn" glow={glow} disabled={disabled} onPress={() => onAction('wait')} /> : <View style={[styles.hub, { borderColor: `${glow}33` }]} />}
        <Key icon="right" label="Move right" glow={glow} disabled={disabled} onPress={() => onAction('right')} />
      </View>
      <View style={styles.row}>
        <Key icon="down" label="Move down" glow={glow} disabled={disabled} onPress={() => onAction('down')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#0A0E18',
    borderWidth: 1,
    gap: 4,
    alignItems: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  key: { width: KEY, height: KEY, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  keyTop: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%' },
  hub: { width: KEY, height: KEY, borderRadius: KEY, borderWidth: 1, transform: [{ scale: 0.55 }] },
});

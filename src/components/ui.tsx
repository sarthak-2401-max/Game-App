// Shared UI primitives: buttons, panels, badges, toggles and the modal sheet.
import React, { useEffect, useRef } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { sound } from '../services/audio/sound';
import { colors, radius, space, TOUCH, type } from '../theme/theme';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'reward' | 'danger';

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.cyan, fg: '#04212A', border: '#9CF5FF' },
  secondary: { bg: colors.surfaceHi, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.textDim, border: 'transparent' },
  reward: { bg: '#2A1E08', fg: colors.amber, border: colors.amber },
  danger: { bg: '#2A0E14', fg: colors.danger, border: colors.danger },
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled,
  style,
  sublabel,
  accessibilityHint,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  sublabel?: string;
  accessibilityHint?: string;
  testID?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        sound.play('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={v.fg} />}
      <View style={{ alignItems: icon ? 'flex-start' : 'center', flexShrink: 1 }}>
        <Text style={[styles.btnText, { color: v.fg }]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[styles.btnSub, { color: v.fg }]} numberOfLines={2}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, disabled, size = TOUCH, badge, active }: { icon: IconName; onPress: () => void; label: string; disabled?: boolean; size?: number; badge?: string; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        sound.play('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          width: size,
          height: size,
          opacity: disabled ? 0.35 : 1,
          borderColor: active ? colors.cyan : pressed ? colors.text : colors.border,
          backgroundColor: active ? '#0E2A33' : pressed ? '#1E2740' : colors.surface,
          transform: [{ scale: pressed && !disabled ? 0.93 : 1 }],
        },
      ]}
    >
      <Icon name={icon} size={size * 0.48} color={active ? colors.cyan : colors.text} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CoinBadge({ coins, compact }: { coins: number; compact?: boolean }) {
  return (
    <View style={[styles.coinBadge, compact && { paddingVertical: 4 }]} accessibilityLabel={`${coins} Escape Coins`} accessible>
      <Icon name="coin" size={compact ? 16 : 20} />
      <Text style={styles.coinText}>{coins}</Text>
    </View>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function ProgressBar({ value, max, color = colors.cyan, height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <View style={{ height, backgroundColor: '#1A2133', borderRadius: height, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function ToggleRow({ label, value, onChange, icon, description }: { label: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName; description?: string }) {
  return (
    <View style={styles.toggleRow}>
      {icon && <Icon name={icon} size={20} color={colors.textDim} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDesc}>{description}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.cyanDim, false: '#2A3142' }}
        thumbColor={value ? colors.cyan : '#9AA6BF'}
      />
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

/** Bottom-aligned modal card used for room results, pause, hints and ad offers. */
/**
 * In-tree overlay rather than a native Modal. iOS cannot present a second modal (or an ad SDK's
 * full-screen controller) while one is already showing, which left the game waiting forever when
 * an ad or a second sheet opened over the result sheet. Render order decides stacking: later
 * sheets sit above earlier ones, and the root-level ad host and toasts sit above all of them.
 */
export function Sheet({ visible, onRequestClose, children, title }: { visible: boolean; onRequestClose?: () => void; children: React.ReactNode; title?: string }) {
  const closeRef = useRef(onRequestClose);
  useEffect(() => {
    closeRef.current = onRequestClose;
  });
  useEffect(() => {
    if (!visible) return;
    // Android back closes the sheet (handlers registered later take precedence).
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current?.();
      return true;
    });
    return () => sub.remove();
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.overlay}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView bounces={false} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {title ? (
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {children}
          </ScrollView>
        </View>
      </View>
    </Animated.View>
  );
}

export function Pulse({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const v = useSharedValue(1);
  useEffect(() => {
    if (enabled) v.value = withRepeat(withSequence(withTiming(1.04, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    else v.value = 1;
  }, [enabled, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  btn: {
    minHeight: TOUCH + 4,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  btnText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  btnSub: { fontSize: 12, fontWeight: '600', opacity: 0.85, marginTop: 1 },
  iconBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#1A1205', fontSize: 11, fontWeight: '900' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1B160C', borderColor: '#5A3F12', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  coinText: { color: colors.amber, fontWeight: '900', fontSize: 15, fontVariant: ['tabular-nums'] },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH + 8, paddingVertical: space.xs },
  toggleLabel: { color: colors.text, ...type.body },
  toggleDesc: { color: colors.textMuted, ...type.small, marginTop: 2 },
  section: { color: colors.textDim, ...type.tiny, textTransform: 'uppercase', marginTop: space.lg, marginBottom: space.sm },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, maxWidth: 480, width: '100%', maxHeight: '92%', alignSelf: 'center', overflow: 'hidden' },
  sheetContent: { padding: space.xl, gap: space.md },
  sheetTitle: { color: colors.text, ...type.h1, textAlign: 'center' },
});

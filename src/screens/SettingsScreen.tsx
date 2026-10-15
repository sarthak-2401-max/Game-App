import * as Application from 'expo-application';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Panel, SectionTitle, Sheet, ToggleRow } from '../components/ui';
import { APP } from '../config/app';
import { adService } from '../services/ads/adService';
import { showPrivacyOptions } from '../services/ads/consent';
import { analytics } from '../services/analytics/analytics';
import { useApp } from '../state/useApp';
import { useToast } from '../state/useToast';
import { colors, space, type } from '../theme/theme';

export function SettingsScreen() {
  const save = useApp((s) => s.save);
  const setSettings = useApp((s) => s.setSettings);
  const navigate = useApp((s) => s.navigate);
  const resetProgress = useApp((s) => s.resetProgress);
  const privacyOptionsRequired = useApp((s) => s.privacyOptionsRequired);
  const toast = useToast((s) => s.show);
  const insets = useSafeAreaInsets();
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const st = save.settings;

  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'dev';
  const build = Application.nativeBuildVersion;

  const openPrivacyChoices = async () => {
    const shown = await showPrivacyOptions();
    if (!shown) toast('Ad privacy choices are not available on this device or in this region.', 'info');
  };

  const consentText = save.consent.flowCompletedAt
    ? save.consent.personalizedAds
      ? 'Personalised ads allowed'
      : 'Non-personalised ads only'
    : 'Not asked yet (asked after the first rooms)';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        <ScreenHeader title="Settings" showCoins={false} />
      </View>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + space.xl }]}>
        <SectionTitle>Audio and feel</SectionTitle>
        <Panel>
          <ToggleRow icon="sound" label="Sound effects" value={st.sound} onChange={(v) => setSettings({ sound: v })} />
          <ToggleRow icon="music" label="Music" value={st.music} onChange={(v) => setSettings({ music: v })} />
          <ToggleRow icon="voice" label="Voiceover" description="Characters read the story aloud. Subtitles always show." value={st.voiceover} onChange={(v) => setSettings({ voiceover: v })} />
          {Platform.OS !== 'web' && <ToggleRow icon="vibrate" label="Haptics" value={st.haptics} onChange={(v) => setSettings({ haptics: v })} />}
        </Panel>

        <SectionTitle>Gameplay</SectionTitle>
        <Panel>
          <ToggleRow icon="motion" label="Reduce motion" description="Shorter animations, no screen shake." value={st.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
          <ToggleRow icon="grid" label="On-screen arrows" description="Show a direction pad as well as swipe and tap." value={st.showDpad} onChange={(v) => setSettings({ showDpad: v })} />
        </Panel>

        <SectionTitle>Privacy</SectionTitle>
        <Panel style={{ gap: space.md }}>
          <View>
            <Text style={styles.label}>Ad consent</Text>
            <Text style={styles.dim}>{consentText}</Text>
          </View>
          {Platform.OS !== 'web' && (
            <Button
              label="Ad privacy choices"
              icon="shield"
              onPress={openPrivacyChoices}
              sublabel={privacyOptionsRequired ? 'Review or change your consent' : undefined}
            />
          )}
          <Button label="Privacy information" icon="info" onPress={() => navigate({ name: 'privacy' })} />
        </Panel>

        <SectionTitle>Data</SectionTitle>
        <Panel style={{ gap: space.md }}>
          <Text style={styles.dim}>Your progress is saved only on this device. Uninstalling the app deletes it.</Text>
          <Button label="Reset all progress" variant="danger" onPress={() => setConfirmStep(1)} />
        </Panel>

        <SectionTitle>About</SectionTitle>
        <Panel style={{ gap: 4 }}>
          <Text style={styles.label}>{APP.name}</Text>
          <Text style={styles.dim}>
            Version {version}
            {build ? ` (${build})` : ''}
          </Text>
          {APP.supportEmail ? <Text style={styles.dim}>Support: {APP.supportEmail}</Text> : null}
          {__DEV__ && (
            <Text style={[styles.dim, { color: colors.amber, marginTop: 6 }]}>
              Development build · ads: {adService.providerName}
              {adService.isSimulation ? ' (simulated)' : ''}
            </Text>
          )}
        </Panel>
      </ScrollView>

      <Sheet visible={confirmStep === 1} title="Reset progress?" onRequestClose={() => setConfirmStep(0)}>
        <Text style={styles.center}>This erases every completed room, your coins, cosmetics, achievements and streak on this device.</Text>
        <Button label="Continue" variant="danger" onPress={() => setConfirmStep(2)} />
        <Button label="Cancel" variant="ghost" onPress={() => setConfirmStep(0)} />
      </Sheet>
      <Sheet visible={confirmStep === 2} title="Are you absolutely sure?" onRequestClose={() => setConfirmStep(0)}>
        <Text style={styles.center}>This cannot be undone.</Text>
        <Button
          label="Erase everything"
          variant="danger"
          onPress={async () => {
            setConfirmStep(0);
            analytics.track('progress_reset', {});
            await resetProgress();
            toast('Progress reset.', 'info');
          }}
        />
        <Button label="Keep my progress" variant="primary" onPress={() => setConfirmStep(0)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  label: { color: colors.text, ...type.body, fontWeight: '700' },
  dim: { color: colors.textDim, ...type.small },
  center: { color: colors.text, textAlign: 'center', ...type.body },
});

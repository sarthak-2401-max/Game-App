import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Panel, SectionTitle } from '../components/ui';
import { APP } from '../config/app';
import { colors, space, type } from '../theme/theme';

// Plain-language summary shown in-app. The full policy must be hosted by the publisher and its
// URL set in src/config/app.ts (see docs/PRIVACY.md) before store submission.
const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What stays on your device',
    body: 'Your progress, coins, cosmetics, achievements and settings are stored only on this device. There is no account and nothing is uploaded by the game itself.',
  },
  {
    title: 'Advertising',
    body: 'The game shows ads through Google AdMob. Where required, you are asked for consent before any ads load, and on iPhone and iPad you are asked whether apps may track you. If you decline, ads are not personalised. You can change your choice any time from Settings, under Ad privacy choices.',
  },
  {
    title: 'Rewarded ads are optional',
    body: 'Watching an ad is always your choice. You only receive the reward if the ad finishes. Every room can be completed without watching ads.',
  },
  {
    title: 'Analytics',
    body: 'This version does not include a third-party analytics service. Gameplay events such as rooms completed are counted only for local debugging.',
  },
  {
    title: 'Children',
    body: 'Ads are requested with a general-audience content rating. The game does not knowingly collect personal information from children.',
  },
];

export function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        <ScreenHeader title="Privacy" showCoins={false} />
      </View>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + space.xl, gap: space.sm }]}>
        {SECTIONS.map((s) => (
          <View key={s.title}>
            <SectionTitle>{s.title}</SectionTitle>
            <Panel>
              <Text style={styles.body}>{s.body}</Text>
            </Panel>
          </View>
        ))}
        <SectionTitle>Full policy</SectionTitle>
        <Panel style={{ gap: space.md }}>
          {APP.privacyPolicyUrl ? (
            <Button label="Open privacy policy" icon="info" onPress={() => Linking.openURL(APP.privacyPolicyUrl)} />
          ) : (
            <Text style={styles.body}>The full privacy policy link will appear here.</Text>
          )}
          {__DEV__ && !APP.privacyPolicyUrl && (
            <Text style={[styles.body, { color: colors.amber }]}>Developer: set privacyPolicyUrl in src/config/app.ts before release.</Text>
          )}
          {APP.supportEmail ? <Text style={styles.body}>Questions: {APP.supportEmail}</Text> : null}
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  body: { color: colors.text, ...type.body, lineHeight: 21 },
});

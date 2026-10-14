// Renders the DEVELOPMENT ad simulator. Clearly labelled; never present in production builds
// because the mock provider is only selected when __DEV__ is true.
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { mockProvider, type MockAdRequest } from '../../services/ads/mockProvider';
import { colors, radius, space } from '../../theme/theme';
import { Button } from '../ui';

export function MockAdHost() {
  const [req, setReq] = useState<MockAdRequest | null>(null);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    mockProvider.attachHost((r) => {
      setReq(r);
      setSeconds(3);
    });
    return () => mockProvider.attachHost(null);
  }, []);
  useEffect(() => {
    if (!req) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [req]);
  useEffect(() => {
    if (!req) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      req.dismiss();
      return true;
    });
    return () => sub.remove();
  }, [req]);
  if (!req) return null;
  // A plain overlay, not a Modal: it must be able to appear above any open sheet (see Sheet).
  return (
    <View style={styles.overlay}>
      <View style={styles.back}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.tag}>SIMULATED AD · DEVELOPMENT ONLY</Text>
          <Text style={styles.title}>{req.kind === 'rewarded' ? 'Rewarded video (simulated)' : 'Interstitial (simulated)'}</Text>
          <Text style={styles.body}>
            No ad network was contacted. Use the buttons to test how the game handles each outcome.
          </Text>
          <Button
            label={seconds > 0 ? `Finish ad (${seconds})` : 'Finish ad'}
            sublabel={req.kind === 'rewarded' ? 'Simulates the earned-reward callback' : undefined}
            variant="primary"
            disabled={seconds > 0}
            onPress={req.complete}
          />
          <Button label="Close early" sublabel="No reward should be granted" onPress={req.dismiss} />
          <Button label="Simulate failure" variant="danger" onPress={req.fail} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000 },
  back: { flex: 1, backgroundColor: '#000000E6', justifyContent: 'center', padding: space.xl },
  card: { backgroundColor: '#14101F', borderColor: colors.violet, borderWidth: 2, borderRadius: radius.xl, padding: space.xl, gap: space.md },
  tag: { color: colors.violet, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.textDim, textAlign: 'center' },
});

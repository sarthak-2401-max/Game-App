import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, BackHandler, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { MockAdHost } from './src/components/ads/MockAdHost';
import { Toast } from './src/components/Toast';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { LevelSelectScreen } from './src/screens/LevelSelectScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { RewardsScreen } from './src/screens/RewardsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { analytics } from './src/services/analytics/analytics';
import { sound } from './src/services/audio/sound';
import { useApp } from './src/state/useApp';
import { colors } from './src/theme/theme';

function Router() {
  const route = useApp((s) => s.stack[s.stack.length - 1]);
  switch (route.name) {
    case 'game':
      return <GameScreen />;
    case 'levels':
      return <LevelSelectScreen />;
    case 'rewards':
      return <RewardsScreen tab={route.tab ?? 'shop'} />;
    case 'settings':
      return <SettingsScreen />;
    case 'privacy':
      return <PrivacyScreen />;
    case 'journal':
      return <JournalScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  const ready = useApp((s) => s.ready);

  useEffect(() => {
    useApp.getState().init();
    sound.init();
    // Screens with their own back behaviour (gameplay) register later and take precedence.
    const back = BackHandler.addEventListener('hardwareBackPress', () => useApp.getState().back());
    const appState = AppState.addEventListener('change', (s) => {
      const active = s === 'active';
      sound.setAppActive(active);
      if (active) analytics.startSession();
      else analytics.endSession();
    });
    return () => {
      back.remove();
      appState.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ErrorBoundary>
          {ready ? (
            <Router />
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.cyan} size="large" accessibilityLabel="Loading" />
            </View>
          )}
        </ErrorBoundary>
        <Toast />
        <MockAdHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

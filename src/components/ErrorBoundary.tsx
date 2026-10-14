// Last-resort crash screen. Progress is saved after every change, so returning home is safe.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/useApp';
import { useSession } from '../state/useSession';
import { colors, space, type } from '../theme/theme';
import { log } from '../utils/log';
import { Button } from './ui';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.error('ui', 'Unhandled render error', { message: error.message, stack: info.componentStack });
  }

  private recover = () => {
    useSession.getState().clear();
    useApp.getState().home();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>Your progress is saved. Return to the menu to keep playing.</Text>
        {__DEV__ && <Text style={styles.dev}>{String(this.state.error?.message)}</Text>}
        <Button label="Back to menu" variant="primary" onPress={this.recover} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  title: { color: colors.text, ...type.h1, textAlign: 'center' },
  body: { color: colors.textDim, ...type.body, textAlign: 'center' },
  dev: { color: colors.danger, ...type.small, textAlign: 'center' },
});

// App.jsx — Entry point cho AIBox app (JavaScript)
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0F1115',
    card: '#1A1D24',
    text: '#FFFFFF',
    border: '#2A2E36',
    primary: '#6C5CE7',
  },
};

// Chờ 2 việc xong mới mount navigator:
//   1. state.isLoading  → AsyncStorage (ví, markets, quests...)
//   2. state.authReady  → Firebase Auth đã restore phiên + đọc users/{uid}
// Tránh flash màn login rồi nhảy vào app khi Firebase còn đang restore session.
function Root() {
  const { state } = useApp();

  if (state.isLoading || !state.authReady) return <View style={styles.boot} />;
  if (!state.user) return <AuthScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    // initialMetrics: có sẵn insets ngay frame đầu, tránh content bị nhảy/che dưới notch
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: '#0F1115' },
});

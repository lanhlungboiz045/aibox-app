// App.jsx — Entry point cho AIBox app (JavaScript)
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { ToastProvider } from './src/components/ui';
import { colors } from './src/theme/tokens';

// Theme điều hướng lấy từ tokens (trước đây hard-code 5 mã màu)
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accentStrong,
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
      {/* Toast/snackbar toàn cục, phải nằm trong SafeAreaProvider để tránh tai thỏ */}
      <ToastProvider>
        <AppProvider>
          <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
          <Root />
        </AppProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.bg },
});

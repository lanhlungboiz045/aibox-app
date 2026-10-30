// App.jsx — Entry point cho AIBox app (JavaScript)
import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { Skeleton, ToastProvider } from './src/components/ui';
import { colors, layout, radius, spacing, type } from './src/theme/tokens';

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

// Khung xương lúc khởi động: đúng bố cục Home (4 ô + card) để không bị "nhảy" khi vào app
function BootSkeleton() {
  return (
    <View style={styles.boot} accessibilityLabel="Đang tải AIBox" accessibilityRole="progressbar">
      <View style={styles.bootInner}>
        <Text style={styles.bootBrand} maxFontSizeMultiplier={1.2}>AIBox</Text>
        <Text style={styles.bootText} maxFontSizeMultiplier={1.3}>Đang tải dữ liệu…</Text>
        <View style={styles.bootRow}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} width="22%" height={84} br={radius.lg} />)}
        </View>
        <Skeleton height={64} br={radius.md} />
        <Skeleton height={140} br={radius.lg} />
      </View>
    </View>
  );
}

// Chờ 2 việc xong mới mount navigator:
//   1. state.isLoading  → AsyncStorage (ví, markets, quests...)
//   2. state.authReady  → Firebase Auth đã restore phiên + đọc users/{uid}
// Tránh flash màn login rồi nhảy vào app khi Firebase còn đang restore session.
function Root() {
  const { state } = useApp();

  if (state.isLoading || !state.authReady) return <BootSkeleton />;
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
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: layout.gutter,
    justifyContent: 'center',
  },
  bootInner: { gap: spacing.lg },
  bootBrand: { ...type.h1, color: colors.text },
  bootText: { ...type.small, color: colors.textFaint },
  bootRow: { flexDirection: 'row', justifyContent: 'space-between' },
});

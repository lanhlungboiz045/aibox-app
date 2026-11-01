// App.jsx — Entry point cho AIBox app (JavaScript)
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { Skeleton, ToastProvider } from './src/components/ui';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Onboarding, useOnboardingSeen } from './src/components/Onboarding';
import { colors, isDark, layout, radius, spacing, type } from './src/theme/tokens';

// Theme điều hướng lấy từ tokens (trước đây hard-code 5 mã màu).
// Bảng tối dùng DarkTheme, bảng sáng dùng DefaultTheme để các màn hình mặc
// định của React Navigation (back button, card...) cũng đổi màu theo.
const baseNavTheme = isDark ? DarkTheme : DefaultTheme;
const navTheme = {
  ...baseNavTheme,
  dark: isDark,
  colors: {
    ...baseNavTheme.colors,
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
//   1. state.isLoading  → AsyncStorage (ví, quests...)
//   2. state.authReady  → Firebase Auth đã restore phiên + đọc users/{uid}
// Tránh flash màn login rồi nhảy vào app khi Firebase còn đang restore session.
// Bước 6: thêm cờ onboarding (lần mở app đầu tiên) — xong 3 slide mới tới đăng nhập.
function Root() {
  const { state } = useApp();
  const { seen, complete } = useOnboardingSeen();

  if (state.isLoading || !state.authReady || seen === null) return <BootSkeleton />;
  // Lần đầu mở app: giới thiệu 3 slide, "Bỏ qua" cũng vào được ngay
  if (!seen) return <Onboarding onDone={complete} />;
  if (!state.user) return <AuthScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}

// Android: tô thanh điều hướng hệ thống bằng màu nền app thay vì mặc định trắng.
// Chạy 1 lần lúc mở app; đổi theme sáng/tối thì icon tự đổi theo.
function useAndroidNavigationBar() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // require trong try/catch: dev client cũ chưa cài module sẽ bỏ qua an toàn
    // (chỉ cần rebuild native một lần để bản mới có expo-navigation-bar).
    let NavigationBar;
    try {
      NavigationBar = require('expo-navigation-bar');
      NavigationBar.setBackgroundColorAsync(colors.bg).catch(() => {});
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => {});
    } catch {
      // Bỏ qua — màu thanh điều hướng vẫn do styles.xml/app.json quyết định.
    }
  }, []);
}

export default function App() {
  useAndroidNavigationBar();

  return (
    // initialMetrics: có sẵn insets ngay frame đầu, tránh content bị nhảy/che dưới notch
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/* Toast/snackbar toàn cục, phải nằm trong SafeAreaProvider để tránh tai thỏ */}
      <ToastProvider>
        <AppProvider>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
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

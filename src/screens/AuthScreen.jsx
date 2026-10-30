// screens/AuthScreen.jsx — Đăng nhập bằng Google (Firebase Authentication)
// Chỉ còn 1 phương thức: Google. Không còn email/password/GitHub/Discord/Wallet.
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  firebaseConfig,
  isFirebaseConfigured,
  missingFirebaseFields,
  GOOGLE_WEB_CLIENT_ID,
} from '../config/firebase';
import { isGoogleSignInNativeAvailable } from '../services/auth';
import { colors, touch } from '../theme/tokens';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const {
    state, signInWithGoogle, clearAuthNotice, isGoogleSignInConfigured, enterDemoMode,
  } = useApp();
  const [loading, setLoading] = useState(false);
  const nativeAvailable = isGoogleSignInNativeAvailable();
  const firebaseReady = isFirebaseConfigured && Boolean(GOOGLE_WEB_CLIENT_ID);
  const canSignIn = firebaseReady && nativeAvailable && isGoogleSignInConfigured;

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    // Người dùng bấm huỷ trên sheet Google → không báo lỗi
    if (!result.ok && !result.cancelled) {
      Alert.alert('Đăng nhập thất bại', result.error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.logo}>{'\u{1F916}'}</Text>
        <Text style={styles.title}>AIBox</Text>
        <Text style={styles.subtitle}>
          AI Hub · Prediction Market · Token nội bộ
        </Text>
      </View>

      {state.authNotice && (
        <TouchableOpacity accessibilityRole="button" style={styles.noticeBox} onPress={clearAuthNotice} activeOpacity={0.8}>
          <Text style={styles.noticeText}>{'\u{26A0}'} {state.authNotice}</Text>
          <Text style={styles.noticeClose}>Đóng</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Đăng nhập để tiếp tục</Text>
        <Text style={styles.cardSub}>
          AIBox dùng Google để xác thực và lưu hồ sơ người dùng trên Firebase.
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.googleBtn, (loading || !canSignIn) && styles.googleBtnDisabled]}
          onPress={handleGoogle}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onBright} />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
            </>
          )}
        </TouchableOpacity>

        {!canSignIn && (
          <View style={styles.setupBox}>
            <Text style={styles.setupTitle}>
              {missingFirebaseFields.length > 0 || !GOOGLE_WEB_CLIENT_ID
                ? 'Chưa điền config Firebase (.env)'
                : 'Expo Go không hỗ trợ Google Sign-In'}
            </Text>
            {missingFirebaseFields.length > 0 ? (
              <>
                <Text style={styles.setupText}>
                  Thiếu: {missingFirebaseFields.join(', ')}
                </Text>
                <Text style={styles.setupText}>
                  1. Firebase Console → Project settings → Your apps → Web app{'\n'}
                  2. Copy 6 giá trị firebaseConfig vào .env{'\n'}
                  3. Restart Metro: npx expo start -c
                </Text>
              </>
            ) : !GOOGLE_WEB_CLIENT_ID ? (
              <Text style={styles.setupText}>
                1. Firebase Console → Authentication → bật provider Google{'\n'}
                2. Copy "Web SDK configuration → Web client ID"{'\n'}
                3. Thêm vào .env: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...{'\n'}
                4. Restart Metro: npx expo start -c
              </Text>
            ) : (
              <Text style={styles.setupText}>
                Đang chạy trong Expo Go — app thiếu module native nên không đăng nhập được.
                {'\n\n'}Khi cần đăng nhập Google thật, build dev client:
                {'\n'}  npx expo run:android
                {'\n'}rồi mở app "AIBox" đã cài trên điện thoại.
              </Text>
            )}
          </View>
        )}

        {/* CHỈ DEV: Expo Go không có Google Sign-In native → cho test UI bằng ví local */}
        {__DEV__ && !nativeAvailable && (
          <TouchableOpacity accessibilityRole="button" style={styles.demoBtn} onPress={enterDemoMode} activeOpacity={0.85}>
            <Text style={styles.demoBtnText}>{'\u{1F9EA}'} Vào chế độ demo (chỉ dev)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.terms}>
          Bằng việc đăng nhập, bạn đồng ý AIBox là nền tảng giải trí: token là credit nội bộ,
          không phải tiền thật.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Firebase project: {firebaseConfig.projectId || '(chưa điền .env)'}
        </Text>
        <Text style={styles.footerHint}>
          Native Google Sign-In không chạy trong Expo Go — cần dev build.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' },
  noticeBox: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    minHeight: touch.min,
  },
  noticeText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  noticeClose: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'right' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 20,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  cardSub: { color: colors.textDim, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    // Nền trắng là quy định nhận diện của nút Google → giữ cố định ở cả 2 theme
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 13,
    minHeight: touch.min,
  },
  googleBtnDisabled: { opacity: 0.7 },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.google,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: { color: colors.onAccent, fontSize: 13, fontWeight: '800' },
  googleBtnText: { color: colors.onBright, fontSize: 15, fontWeight: '700' },
  demoBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    minHeight: touch.min,
  },
  demoBtnText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  setupBox: {
    marginTop: 16,
    backgroundColor: colors.warningDim,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 10,
    padding: 12,
  },
  setupTitle: { color: colors.warning, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  setupText: { color: colors.gold, fontSize: 12, lineHeight: 17 },
  terms: { color: colors.textFaint, fontSize: 12, lineHeight: 15, textAlign: 'center', marginTop: 16 },
  footer: { alignItems: 'center', marginTop: 22 },
  footerText: { color: colors.textDim, fontSize: 12, fontFamily: 'monospace' },
  footerHint: { color: colors.textFaint, fontSize: 12, marginTop: 4, textAlign: 'center' },
});

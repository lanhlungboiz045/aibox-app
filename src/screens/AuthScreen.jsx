// screens/AuthScreen.jsx — Đăng nhập bằng Google (Firebase Authentication)
// Chỉ còn 1 phương thức: Google. Không còn email/password/GitHub/Discord/Wallet.
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { firebaseConfig } from '../config/firebase';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { state, signInWithGoogle, clearAuthNotice, isGoogleSignInConfigured } = useApp();
  const [loading, setLoading] = useState(false);

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
        <TouchableOpacity style={styles.noticeBox} onPress={clearAuthNotice} activeOpacity={0.8}>
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
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={handleGoogle}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1A1D24" />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
            </>
          )}
        </TouchableOpacity>

        {!isGoogleSignInConfigured && (
          <View style={styles.setupBox}>
            <Text style={styles.setupTitle}>Chưa cấu hình Google Client ID</Text>
            <Text style={styles.setupText}>
              1. Firebase Console → Authentication → bật provider Google{'\n'}
              2. Copy "Web SDK configuration → Web client ID"{'\n'}
              3. Thêm vào .env: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...{'\n'}
              4. Restart bằng dev client: npx expo run:android
            </Text>
          </View>
        )}

        <Text style={styles.terms}>
          Bằng việc đăng nhập, bạn đồng ý AIBox là nền tảng giải trí: token là credit nội bộ,
          không phải tiền thật.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Firebase project: {firebaseConfig.projectId}</Text>
        <Text style={styles.footerHint}>
          Native Google Sign-In không chạy trong Expo Go — cần dev build.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  content: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: '#8E8E93', fontSize: 13, marginTop: 6, textAlign: 'center' },
  noticeBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { color: '#FF8A8A', fontSize: 12, lineHeight: 18 },
  noticeClose: { color: '#FF8A8A', fontSize: 11, fontWeight: '700', marginTop: 6, textAlign: 'right' },
  card: {
    backgroundColor: '#1A1D24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2E36',
    padding: 20,
  },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  cardSub: { color: '#8E8E93', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 13,
  },
  googleBtnDisabled: { opacity: 0.7 },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  googleBtnText: { color: '#1A1D24', fontSize: 15, fontWeight: '700' },
  setupBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 183, 77, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
    borderRadius: 10,
    padding: 12,
  },
  setupTitle: { color: '#FFB74D', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  setupText: { color: '#C9A66B', fontSize: 11, lineHeight: 17 },
  terms: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 16 },
  footer: { alignItems: 'center', marginTop: 22 },
  footerText: { color: '#8E8E93', fontSize: 11, fontFamily: 'monospace' },
  footerHint: { color: '#5C5C5C', fontSize: 10, marginTop: 4, textAlign: 'center' },
});

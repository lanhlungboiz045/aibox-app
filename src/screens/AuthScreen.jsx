// screens/AuthScreen.jsx — Đăng nhập email/mật khẩu và tài khoản mẫu
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppIcon } from '../components/ui/AppIcon';
import {
  isFirebaseConfigured,
  GOOGLE_WEB_CLIENT_ID,
} from '../config/firebase';
import { isGoogleSignInNativeAvailable } from '../services/auth';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';
import { ROLE_LABELS } from '../data/accounts';
import { colors, touch } from '../theme/tokens';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const {
    state, signInWithGoogle, signInWithEmail, registerWithEmail, signInDemoAccount,
    clearAuthNotice, isGoogleSignInConfigured,
  } = useApp();
  const [loading, setLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const nativeAvailable = isGoogleSignInNativeAvailable();
  const firebaseReady = isFirebaseConfigured && Boolean(GOOGLE_WEB_CLIENT_ID);
  const canSignIn = firebaseReady && nativeAvailable && isGoogleSignInConfigured;

  const handleEmailAuth = async () => {
    if (loading) return;
    setFormError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setFormError('Nhập email và mật khẩu để tiếp tục.');
      return;
    }
    if (creatingAccount && password.length < 6) {
      setFormError('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }
    setLoading(true);
    try {
      const result = creatingAccount
        ? await registerWithEmail(cleanEmail, password)
        : await signInWithEmail(cleanEmail, password);
      if (!result.ok) setFormError(result.error || 'Không thể xác thực tài khoản.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    setFormError('');
    try {
      const result = await signInWithGoogle();
      if (!result.ok && !result.cancelled) setFormError(result.error || 'Không thể đăng nhập bằng Google.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (account) => {
    if (loading) return;
    setLoading(true);
    setFormError('');
    try {
      const result = signInDemoAccount(account.email, account.password);
      if (!result.ok) setFormError(result.error);
    } finally {
      setLoading(false);
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
        <AppIcon name="cpu" size={40} color={colors.accentSoft} style={styles.logo} />
        <Text style={styles.title}>AIBox</Text>
        <Text style={styles.subtitle}>
          AI Hub · Tài Xỉu · Ví token nội bộ
        </Text>
      </View>

      {state.authNotice && (
        <TouchableOpacity accessibilityRole="button" style={styles.noticeBox} onPress={clearAuthNotice} activeOpacity={0.8}>
          <Text style={styles.noticeText}>{state.authNotice}</Text>
          <Text style={styles.noticeClose}>Đóng</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Đăng nhập để tiếp tục</Text>
        <Text style={styles.cardSub}>
          Đăng nhập hoặc tạo tài khoản bằng email và mật khẩu.
        </Text>

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="ban@email.com"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!loading}
        />
        <Text style={styles.inputLabel}>Mật khẩu</Text>
        <TextInput
          accessibilityLabel="Mật khẩu"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Ít nhất 6 ký tự"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={creatingAccount ? 'new-password' : 'password'}
          textContentType={creatingAccount ? 'newPassword' : 'password'}
          editable={!loading}
          onSubmitEditing={handleEmailAuth}
          returnKeyType="go"
        />
        {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          style={[styles.emailBtn, loading && styles.googleBtnDisabled]}
          onPress={handleEmailAuth}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : <Text style={styles.emailBtnText}>{creatingAccount ? 'Tạo tài khoản' : 'Đăng nhập'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.modeToggle}
          onPress={() => {
            setCreatingAccount(value => !value);
            setFormError('');
          }}
          disabled={loading}
        >
          <Text style={styles.modeToggleText}>
            {creatingAccount ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Tạo tài khoản'}
          </Text>
        </TouchableOpacity>

        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>hoặc</Text>
          <View style={styles.separatorLine} />
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || !canSignIn }}
          style={[styles.googleBtn, (loading || !canSignIn) && styles.googleBtnDisabled]}
          onPress={handleGoogle}
          activeOpacity={0.85}
          disabled={loading || !canSignIn}
        >
          {loading ? <ActivityIndicator color={colors.onBright} /> : (
            <>
              <View style={styles.googleIcon}><Text style={styles.googleIconText}>G</Text></View>
              <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
            </>
          )}
        </TouchableOpacity>

        {!canSignIn && (
          <View style={styles.setupBox}>
            <Text style={styles.setupTitle}>Đăng nhập Google chưa khả dụng</Text>
            <Text style={styles.setupText}>
              Bạn vẫn có thể đăng nhập hoặc tạo tài khoản bằng email và mật khẩu ở trên.
            </Text>
          </View>
        )}

        {__DEV__ && (
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Tài khoản mẫu · chỉ dùng để thử nghiệm</Text>
            {DEMO_ACCOUNTS.map(account => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Đăng nhập tài khoản mẫu ${ROLE_LABELS[account.role]}`}
                key={account.id}
                style={styles.demoAccount}
                onPress={() => handleDemoLogin(account)}
                disabled={loading}
              >
                <View style={styles.demoAccountInfo}>
                  <Text style={styles.demoAccountRole}>{ROLE_LABELS[account.role]}</Text>
                  <Text style={styles.demoAccountCredentials}>{account.email} · {account.password}</Text>
                </View>
                <AppIcon name="chevron-right" size={16} color={colors.textDim} />
              </TouchableOpacity>
            ))}
            <Text style={styles.demoNote}>Tài khoản mẫu lưu ví riêng trên thiết bị này.</Text>
          </View>
        )}

        <Text style={styles.terms}>
          Bằng việc đăng nhập, bạn đồng ý AIBox là nền tảng giải trí: token là điểm nội bộ,
          không phải tiền thật.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AIBox · Ví token nội bộ</Text>
        <Text style={styles.footerHint}>
          Token dùng để gọi AI và chơi Tài Xỉu, không đổi được thành tiền thật.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 28 },
  logo: { marginBottom: 8 },
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
  inputLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 10,
    color: colors.text,
    fontSize: 15,
    minHeight: touch.min,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  formError: { color: colors.danger, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  emailBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentStrong,
    borderRadius: 10,
    paddingVertical: 13,
    minHeight: touch.min,
  },
  emailBtnText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
  modeToggle: { alignItems: 'center', justifyContent: 'center', minHeight: touch.min },
  modeToggleText: { color: colors.accentSoft, fontSize: 13, fontWeight: '600' },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.borderSoft },
  separatorText: { color: colors.textFaint, fontSize: 12 },
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
  demoSection: { marginTop: 18, gap: 7 },
  demoTitle: { color: colors.warning, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  demoAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: touch.min,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  demoAccountInfo: { flex: 1 },
  demoAccountRole: { color: colors.text, fontSize: 13, fontWeight: '600' },
  demoAccountCredentials: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  demoNote: { color: colors.textFaint, fontSize: 11, lineHeight: 15, marginTop: 2 },
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
  footerText: { color: colors.textDim, fontSize: 12, fontVariant: ['tabular-nums'] },
  footerHint: { color: colors.textFaint, fontSize: 12, marginTop: 4, textAlign: 'center' },
});

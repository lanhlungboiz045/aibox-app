// screens/AuthScreen.jsx — Đăng nhập / Đăng ký (MOCK: tài khoản lưu local)
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const DEMO_LOGINS = [
  { label: 'Admin', email: 'admin@aibox.app', password: 'admin123', color: '#FF6B6B' },
  { label: 'Creator', email: 'creator@aibox.app', password: 'creator123', color: '#FFB74D' },
  { label: 'User', email: 'user@aibox.app', password: 'user123', color: '#00CE7E' },
];

const PROVIDERS = [
  { key: 'google', label: 'Google', icon: '\u{1F310}', color: '#4285F4' },
  { key: 'github', label: 'GitHub', icon: '\u{1F431}', color: '#FFFFFF' },
  { key: 'discord', label: 'Discord', icon: '\u{1F3AE}', color: '#5865F2' },
  { key: 'wallet', label: 'MetaMask', icon: '\u{1F98A}', color: '#F7931A' },
];

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithProvider, state, clearAuthNotice } = useApp();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';
  const notice = state.authNotice;

  const fillDemo = (account) => {
    setMode('login');
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  const submit = () => {
    setError(null);
    const result = isLogin ? signIn(email, password) : signUp({ username, email, password });
    if (!result.ok) setError(result.error);
  };

  const socialLogin = (provider) => {
    setError(null);
    setBusy(true);
    // Giả lập network của OAuth provider
    setTimeout(() => {
      const result = signInWithProvider(provider);
      setBusy(false);
      if (!result.ok) setError(result.error);
    }, 350);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Text style={styles.logoMark}>{'\u{1F916}'}</Text>
          <Text style={styles.logo}>AIBox</Text>
          <Text style={styles.tagline}>AI Marketplace · Prediction Market · Token</Text>
        </View>

        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{'\u{26A0}'} {notice}</Text>
            <TouchableOpacity onPress={clearAuthNotice}>
              <Text style={styles.noticeClose}>{'\u{2715}'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, isLogin && styles.tabActive]} onPress={() => { setMode('login'); setError(null); }}>
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, !isLogin && styles.tabActive]} onPress={() => { setMode('register'); setError(null); }}>
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Đăng ký</Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <>
              <Text style={styles.label}>Tên hiển thị</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="VD: SatoshiVn"
                placeholderTextColor="#5C5C5C"
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#5C5C5C"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={isLogin ? '••••••' : 'Ít nhất 6 ký tự'}
            placeholderTextColor="#5C5C5C"
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{'\u{26A0}'} {error}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy}>
            <Text style={styles.submitText}>{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.providerRow}>
            {PROVIDERS.map(provider => (
              <TouchableOpacity
                key={provider.key}
                style={[styles.providerBtn, { borderColor: provider.color + '55' }]}
                onPress={() => socialLogin(provider.key)}
                disabled={busy}
              >
                <Text style={[styles.providerIcon, { color: provider.color }]}>{provider.icon}</Text>
                <Text style={styles.providerLabel}>{provider.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {busy && <ActivityIndicator color="#6C5CE7" style={{ marginTop: 12 }} />}
        </View>

        {isLogin && (
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>{'\u{1F9EA}'} Tài khoản demo</Text>
            {DEMO_LOGINS.map(account => (
              <TouchableOpacity key={account.email} style={styles.demoRow} onPress={() => fillDemo(account)}>
                <Text style={[styles.demoBadge, { color: account.color, borderColor: account.color + '66' }]}>{account.label}</Text>
                <Text style={styles.demoEmail}>{account.email}</Text>
                <Text style={styles.demoFill}>Dùng</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.demoHint}>
              Mật khẩu: admin123 · creator123 · user123{'\n'}
              Auth chạy trên client (demo) — production phải dùng Firebase Auth/backend.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  brand: { alignItems: 'center', marginBottom: 24 },
  logoMark: { fontSize: 44, marginBottom: 6 },
  logo: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: 0.5 },
  tagline: { color: '#5C5C5C', fontSize: 12, marginTop: 4 },
  noticeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255, 183, 77, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.35)' },
  noticeText: { flex: 1, color: '#FFB74D', fontSize: 12, lineHeight: 17 },
  noticeClose: { color: '#FFB74D', fontSize: 14, fontWeight: '700' },
  card: { marginHorizontal: 16, backgroundColor: '#1A1D24', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2A2E36' },
  tabRow: { flexDirection: 'row', backgroundColor: '#0F1115', borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#22262E' },
  tabText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  label: { color: '#8E8E93', fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 12, lineHeight: 17 },
  submitBtn: { backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2A2E36' },
  dividerText: { color: '#5C5C5C', fontSize: 11 },
  providerRow: { flexDirection: 'row', gap: 8 },
  providerBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: '#22262E', borderWidth: 1 },
  providerIcon: { fontSize: 18 },
  providerLabel: { color: '#8E8E93', fontSize: 11 },
  demoBox: { marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: 'rgba(108, 92, 231, 0.08)', borderWidth: 1, borderColor: 'rgba(108, 92, 231, 0.25)', gap: 8 },
  demoTitle: { color: '#A78BFA', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoBadge: { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  demoEmail: { flex: 1, color: '#FFFFFF', fontSize: 12, fontFamily: 'monospace' },
  demoFill: { color: '#6C5CE7', fontSize: 12, fontWeight: '700' },
  demoHint: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, marginTop: 4 },
});

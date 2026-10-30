// screens/LeaderboardScreen.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { LEADERBOARD } from '../data/mockData';
import { formatToken } from '../utils/format';
import { AppDrawer } from '../components/AppDrawer';
import { IconButton } from '../components/ui';
import { useAppDrawer } from '../hooks/useAppDrawer';
import { t } from '../i18n';
import { colors, centeredContent, touch } from '../theme/tokens';

export function LeaderboardScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const { open: openDrawer, drawerProps } = useAppDrawer();

  // Lấy số dư live từ accounts (transfer/copy trade có thể đã thay đổi mock balance)
  const baseRows = LEADERBOARD.map(row => {
    const account = state.accounts.find(a => a.id === row.id || a.username === row.username);
    return account ? { ...row, tokenBalance: account.tokenBalance } : row;
  });

  // Người đang đăng nhập (Firebase) không nằm trong mockData → ghép vào và xếp lại hạng
  const me = state.user;
  const hasMe = baseRows.some(row => row.id === me.id || row.username === me.username);
  const withMe = hasMe
    ? baseRows
    : [...baseRows, { id: me.id, username: me.username, avatar: me.avatar, tokenBalance: me.tokenBalance, rank: 0 }];

  const rows = [...withMe]
    .sort((a, b) => b.tokenBalance - a.tokenBalance)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const openTrader = (trader) => navigation.navigate('TraderProfile', { trader });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.headerRow}>
          <IconButton icon="menu" label={t('nav.openMenu')} onPress={openDrawer} />
          <View style={styles.header}>
            <Text style={styles.title}>Xếp hạng</Text>
            <Text style={styles.subtitle}>Chạm vào trader để xem profile & copy trade</Text>
          </View>
        </View>

        <View style={styles.podium}>
          {top3.map((user, i) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={user.id}
              style={[styles.podiumCard, i === 0 && styles.podiumFirst, i === 1 && styles.podiumSecond, i === 2 && styles.podiumThird]}
              onPress={() => openTrader(user)}
              activeOpacity={0.85}
            >
              <Text style={[styles.podiumRank, i === 0 && styles.podiumRankFirst]}>{i + 1}</Text>
              <Text style={styles.podiumAvatar}>{user.avatar}</Text>
              <Text style={styles.podiumName} numberOfLines={1}>{user.username}</Text>
              <Text style={styles.podiumTokens}>{formatToken(user.tokenBalance)}</Text>
              <Text style={styles.podiumTokenLabel}>{'\u{1F4B0}'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listSection}>
          {rest.map(user => (
            <TouchableOpacity
              accessibilityRole="button"
              key={user.id}
              style={[styles.listItem, user.id === state.user.id && styles.listItemMe]}
              onPress={() => openTrader(user)}
              activeOpacity={0.85}
            >
              <Text style={styles.rank}>#{user.rank}</Text>
              <Text style={styles.avatar}>{user.avatar}</Text>
              <Text style={styles.username}>{user.username}</Text>
              {user.id === state.user.id && (
                <View style={styles.youTag}><Text style={styles.youTagText}>Bạn</Text></View>
              )}
              <Text style={styles.tokenBalance}>{formatToken(user.tokenBalance)} {'\u{1F4B0}'}</Text>
              <Text style={styles.arrow}>{'\u{276F}'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <AppDrawer {...drawerProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4 },
  header: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textFaint, fontSize: 12, marginTop: 3 },
  podium: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  podiumCard: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  podiumFirst: { borderColor: 'rgba(255, 215, 0, 0.3)', backgroundColor: 'rgba(255, 215, 0, 0.08)', transform: [{ scale: 1.05 }] },
  podiumSecond: { borderColor: 'rgba(192, 192, 192, 0.2)' },
  podiumThird: { borderColor: 'rgba(205, 127, 50, 0.2)' },
  podiumRank: { color: colors.textDim, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  podiumRankFirst: { color: colors.warning },
  podiumAvatar: { fontSize: 32, marginBottom: 6 },
  podiumName: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  podiumTokens: { color: colors.accentSoft, fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  podiumTokenLabel: { fontSize: 12 },
  listSection: { paddingHorizontal: 16, gap: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.borderSoft, gap: 10, minHeight: touch.min },
  listItemMe: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  rank: { color: colors.textDim, fontSize: 13, fontWeight: '600', fontFamily: 'monospace', width: 32 },
  avatar: { fontSize: 20 },
  username: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  youTag: { backgroundColor: colors.accentStrong, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  youTagText: { color: colors.onAccent, fontSize: 12, fontWeight: '600' },
  tokenBalance: { color: colors.accentSoft, fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
  arrow: { color: colors.textFaint, fontSize: 12 },
});

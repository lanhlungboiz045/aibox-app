// screens/LeaderboardScreen.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { LEADERBOARD } from '../data/mockData';
import { formatToken } from '../utils/format';

export function LeaderboardScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();

  // Lấy số dư live từ accounts (transfer/copy trade có thể đã thay đổi mock balance)
  const rows = LEADERBOARD.map(row => {
    const account = state.accounts.find(a => a.id === row.id || a.username === row.username);
    return account ? { ...row, tokenBalance: account.tokenBalance } : row;
  });

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

  const openTrader = (trader) => navigation.navigate('TraderProfile', { trader });

  return (
    <ScrollView
      style={styles.container}
      // Tab bar bên dưới đã tự chừa insets.bottom → chỉ cần chừa status bar ở trên
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 20 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{'\u{1F3C6}'} Xếp hạng</Text>
        <Text style={styles.subtitle}>Chạm vào trader để xem profile & copy trade</Text>
      </View>

      <View style={styles.podium}>
        {top3.map((user, i) => (
          <TouchableOpacity
            key={user.id}
            style={[styles.podiumCard, i === 0 && styles.podiumFirst, i === 1 && styles.podiumSecond, i === 2 && styles.podiumThird]}
            onPress={() => openTrader(user)}
            activeOpacity={0.85}
          >
            <Text style={styles.medal}>{medals[i]}</Text>
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
            key={user.id}
            style={[styles.listItem, user.username === state.user.username && styles.listItemMe]}
            onPress={() => openTrader(user)}
            activeOpacity={0.85}
          >
            <Text style={styles.rank}>#{user.rank}</Text>
            <Text style={styles.avatar}>{user.avatar}</Text>
            <Text style={styles.username}>{user.username}</Text>
            {user.username === state.user.username && (
              <View style={styles.youTag}><Text style={styles.youTagText}>Bạn</Text></View>
            )}
            <Text style={styles.tokenBalance}>{formatToken(user.tokenBalance)} {'\u{1F4B0}'}</Text>
            <Text style={styles.arrow}>{'\u{276F}'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#5C5C5C', fontSize: 11, marginTop: 3 },
  podium: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  podiumCard: { flex: 1, alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2E36' },
  podiumFirst: { borderColor: 'rgba(255, 215, 0, 0.3)', backgroundColor: 'rgba(255, 215, 0, 0.08)', transform: [{ scale: 1.05 }] },
  podiumSecond: { borderColor: 'rgba(192, 192, 192, 0.2)' },
  podiumThird: { borderColor: 'rgba(205, 127, 50, 0.2)' },
  medal: { fontSize: 24, marginBottom: 4 },
  podiumAvatar: { fontSize: 32, marginBottom: 6 },
  podiumName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  podiumTokens: { color: '#A78BFA', fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  podiumTokenLabel: { fontSize: 12 },
  listSection: { paddingHorizontal: 16, gap: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2A2E36', gap: 10 },
  listItemMe: { borderColor: '#6C5CE7', backgroundColor: 'rgba(108, 92, 231, 0.08)' },
  rank: { color: '#8E8E93', fontSize: 13, fontWeight: '600', fontFamily: 'monospace', width: 32 },
  avatar: { fontSize: 20 },
  username: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  youTag: { backgroundColor: '#6C5CE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  youTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  tokenBalance: { color: '#A78BFA', fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
  arrow: { color: '#5C5C5C', fontSize: 12 },
});

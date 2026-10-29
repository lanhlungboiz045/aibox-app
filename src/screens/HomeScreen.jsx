// screens/HomeScreen.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { QUESTS, QUEST_TOTAL_REWARD } from '../data/quests';
import { TokenBadge } from '../components/TokenBadge';
import { MarketCard } from '../components/MarketCard';
import { AIModelCard } from '../components/AIModelCard';
import { TransactionItem } from '../components/TransactionItem';
import { DailyRewardModal } from '../components/DailyRewardModal';

export function HomeScreen({ navigation }) {
  const { state, canClaimDaily, nextDailyReward, unreadNotifications, questState } = useApp();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showDaily, setShowDaily] = useState(false);

  const trendingMarkets = [...state.markets].sort((a, b) => b.volume - a.volume).slice(0, 4);
  const popularModels = [...state.aiModels].sort((a, b) => b.popularity - a.popularity).slice(0, 4);
  const recentTxs = state.user.transactions.slice(0, 5);
  const claimedQuests = questState?.claimed?.length || 0;

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); };

  return (
    <ScrollView
      style={styles.container}
      // Tab bar bên dưới đã tự chừa insets.bottom → chỉ cần chừa status bar ở trên
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>AIBox</Text>
        <View style={styles.headerRight}>
          <TokenBadge size="medium" />
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.iconBtnText}>{'\u{1F514}'}</Text>
            {unreadNotifications > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{state.user.avatar}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {canClaimDaily && (
        <TouchableOpacity style={styles.dailyCard} onPress={() => setShowDaily(true)} activeOpacity={0.8}>
          <Text style={styles.dailyIcon}>{'\u{1F381}'}</Text>
          <View style={styles.dailyContent}>
            <Text style={styles.dailyTitle}>Nhận {formatToken(nextDailyReward)} token miễn phí!</Text>
            <Text style={styles.dailySub}>Streak hiện tại: {state.user.dailyStreak} ngày</Text>
          </View>
          <Text style={styles.dailyArrow}>{'\u{276F}'}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.questCard} onPress={() => navigation.navigate('Quests')} activeOpacity={0.8}>
        <Text style={styles.questIcon}>{'\u{1F3AF}'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.questTitle}>Nhiệm vụ ngày · {claimedQuests}/{QUESTS.length}</Text>
          <Text style={styles.questSub}>
            Làm quest để nhận tối đa {formatToken(QUEST_TOTAL_REWARD)} token mỗi ngày
          </Text>
        </View>
        <Text style={styles.questArrow}>{'\u{276F}'}</Text>
      </TouchableOpacity>

      <View style={styles.quickGrid}>
        <TouchableOpacity style={[styles.quickCard, { borderColor: 'rgba(16, 163, 127, 0.3)' }]} onPress={() => navigation.navigate('AIHub')}>
          <Text style={styles.quickIcon}>{'\u{1F916}'}</Text>
          <Text style={styles.quickLabel}>AI Hub</Text>
          <Text style={styles.quickSub}>{state.aiModels.length} models</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickCard, { borderColor: 'rgba(0, 206, 126, 0.3)' }]} onPress={() => navigation.navigate('Markets')}>
          <Text style={styles.quickIcon}>{'\u{1F4C8}'}</Text>
          <Text style={styles.quickLabel}>Markets</Text>
          <Text style={styles.quickSub}>{state.markets.length} events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickCard, { borderColor: 'rgba(255, 183, 77, 0.3)' }]} onPress={() => navigation.navigate('Transfer')}>
          <Text style={styles.quickIcon}>{'\u{1F4B8}'}</Text>
          <Text style={styles.quickLabel}>Transfer</Text>
          <Text style={styles.quickSub}>Gửi token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{'\u{1F525}'} Trending Markets</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Markets')}><Text style={styles.seeAll}>Xem tất cả</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
          {trendingMarkets.map(m => (
            <View key={m.id} style={{ width: 280 }}>
              <MarketCard market={m} onPress={() => navigation.navigate('MarketDetail', { marketId: m.id })}
                onYes={() => navigation.navigate('MarketDetail', { marketId: m.id, initialSide: 'YES' })}
                onNo={() => navigation.navigate('MarketDetail', { marketId: m.id, initialSide: 'NO' })} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{'\u{1F916}'} Popular AI</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AIHub')}><Text style={styles.seeAll}>Xem tất cả</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
          {popularModels.map(m => (
            <View key={m.id} style={{ width: 260 }}>
              <AIModelCard model={m} compact onPress={() => navigation.navigate('AIHub')} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F4DD}'} Hoạt động gần đây</Text>
        {recentTxs.length === 0 ? (
          <Text style={styles.empty}>Chưa có hoạt động nào. Bắt đầu khám phá!</Text>
        ) : (
          <View style={styles.txList}>
            {recentTxs.map(tx => <TransactionItem key={tx.id} tx={tx} />)}
          </View>
        )}
      </View>

      <DailyRewardModal visible={showDaily} onClose={() => setShowDaily(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1A1D24', borderWidth: 1, borderColor: '#2A2E36', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 17 },
  bellBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#22262E', borderWidth: 1, borderColor: '#2A2E36', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  dailyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 183, 77, 0.12)', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.3)', gap: 12 },
  dailyIcon: { fontSize: 28 },
  dailyContent: { flex: 1 },
  dailyTitle: { color: '#FFB74D', fontSize: 14, fontWeight: '600' },
  dailySub: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  dailyArrow: { color: '#FFB74D', fontSize: 16 },
  questCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D24', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(108, 92, 231, 0.35)', gap: 12 },
  questIcon: { fontSize: 26 },
  questTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  questSub: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  questArrow: { color: '#6C5CE7', fontSize: 16 },
  quickGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  quickCard: { flex: 1, backgroundColor: '#22262E', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  quickSub: { color: '#5C5C5C', fontSize: 11, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  seeAll: { color: '#6C5CE7', fontSize: 13 },
  txList: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
  empty: { color: '#5C5C5C', fontSize: 13, textAlign: 'center', padding: 20 },
});

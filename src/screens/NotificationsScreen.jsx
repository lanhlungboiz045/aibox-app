// screens/NotificationsScreen.jsx — Trung tâm thông báo (mock push in-app)
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatRelativeTime, formatToken } from '../utils/format';

const TYPE_META = {
  MARKET_RESOLVED: { icon: '\u{1F3AF}', color: '#00CE7E', label: 'Market' },
  TRANSFER_IN: { icon: '\u{1F4B8}', color: '#A78BFA', label: 'Transfer' },
  CREATOR_FEE: { icon: '\u{1F451}', color: '#FFB74D', label: 'Creator' },
  ROLE_UPGRADE: { icon: '\u{1F396}', color: '#FFB74D', label: 'Role' },
  COPY_TRADE: { icon: '\u{1F4CB}', color: '#4285F4', label: 'Copy trade' },
};

export function NotificationsScreen({ navigation }) {
  const {
    state, notifications, unreadNotifications, markNotificationsRead,
    canClaimDaily, nextDailyReward,
  } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Thông báo</Text>
        <TouchableOpacity onPress={markNotificationsRead} disabled={unreadNotifications === 0}>
          <Text style={[styles.markAll, unreadNotifications === 0 && { color: '#3A3A3A' }]}>Đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      {unreadNotifications > 0 && (
        <Text style={styles.unreadLine}>{unreadNotifications} thông báo chưa đọc</Text>
      )}

      {canClaimDaily && (
        <TouchableOpacity style={styles.streakCard} onPress={() => navigation.navigate('Quests')}>
          <Text style={styles.streakIcon}>{'\u{1F381}'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Streak của bạn sắp bị đứt!</Text>
            <Text style={styles.streakText}>Nhận {formatToken(nextDailyReward)} token hôm nay để giữ chuỗi ngày.</Text>
          </View>
          <Text style={styles.streakArrow}>{'\u{276F}'}</Text>
        </TouchableOpacity>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>{'\u{1F4ED}'}</Text>
          <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
          <Text style={styles.emptyText}>
            Bạn sẽ nhận thông báo khi kèo có kết quả, có người chuyển token, hoặc copy trade được kích hoạt.
          </Text>
        </View>
      ) : (
        notifications.map(item => {
          const meta = TYPE_META[item.type] || { icon: '\u{1F514}', color: '#8E8E93', label: 'Hệ thống' };
          return (
            <View key={item.id} style={[styles.card, !item.read && styles.cardUnread]}>
              <View style={[styles.iconWrap, { borderColor: meta.color + '55' }]}>
                <Text style={styles.icon}>{meta.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
                <View style={styles.cardFoot}>
                  <Text style={[styles.typeTag, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.footnote}>
        Bản demo mô phỏng push notification bằng danh sách trong app. Production dùng FCM + device token lưu ở server.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 60 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  markAll: { color: '#6C5CE7', fontSize: 12, fontWeight: '600', width: 60, textAlign: 'right' },
  unreadLine: { color: '#8E8E93', fontSize: 11, paddingHorizontal: 16, marginBottom: 8 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255, 183, 77, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.3)' },
  streakIcon: { fontSize: 22 },
  streakTitle: { color: '#FFB74D', fontSize: 12, fontWeight: '700' },
  streakText: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  streakArrow: { color: '#FFB74D', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 6 },
  emptyText: { color: '#5C5C5C', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  card: { flexDirection: 'row', gap: 10, backgroundColor: '#1A1D24', borderRadius: 10, marginHorizontal: 16, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: '#2A2E36' },
  cardUnread: { borderColor: 'rgba(108, 92, 231, 0.4)', backgroundColor: 'rgba(108, 92, 231, 0.06)' },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#22262E', borderWidth: 1 },
  icon: { fontSize: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6C5CE7' },
  cardBody: { color: '#8E8E93', fontSize: 12, lineHeight: 17, marginTop: 3 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  typeTag: { fontSize: 10, fontWeight: '700' },
  time: { color: '#5C5C5C', fontSize: 10 },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});

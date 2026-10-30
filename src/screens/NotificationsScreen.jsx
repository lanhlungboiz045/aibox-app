// screens/NotificationsScreen.jsx — Trung tâm thông báo (mock push in-app)
import React from 'react';
import { BackButton } from '../components/ui/BackButton';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppIcon } from '../components/ui/AppIcon';
import { formatRelativeTime, formatToken } from '../utils/format';
import { colors, centeredContent, touch } from '../theme/tokens';

const TYPE_META = {
  MARKET_RESOLVED: { icon: 'target', label: 'Thị trường' },
  TRANSFER_IN: { icon: 'credit-card', label: 'Chuyển token' },
  CREATOR_FEE: { icon: 'award', label: 'Nhà sáng tạo' },
  ROLE_UPGRADE: { icon: 'shield', label: 'Vai trò' },
  COPY_TRADE: { icon: 'copy', label: 'Sao chép lệnh' },
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
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Thông báo</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Đánh dấu tất cả đã đọc"
          accessibilityState={{ disabled: unreadNotifications === 0 }}
          style={styles.markAllAction}
          onPress={markNotificationsRead}
          disabled={unreadNotifications === 0}
        >
          <Text style={[styles.markAll, unreadNotifications === 0 && { color: colors.disabledText }]}>Đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      {unreadNotifications > 0 && (
        <Text style={styles.unreadLine}>{unreadNotifications} thông báo chưa đọc</Text>
      )}

      {canClaimDaily && (
        <TouchableOpacity accessibilityRole="button" style={styles.streakCard} onPress={() => navigation.navigate('Quests')}>
          <AppIcon name="gift" size={20} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Streak của bạn sắp bị đứt!</Text>
            <Text style={styles.streakText}>Nhận {formatToken(nextDailyReward)} token hôm nay để giữ chuỗi ngày.</Text>
          </View>
          <AppIcon name="chevron-right" size={18} color={colors.warning} />
        </TouchableOpacity>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppIcon name="inbox" size={32} color={colors.textDim} />
          <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
          <Text style={styles.emptyText}>
            Bạn sẽ nhận thông báo khi kèo có kết quả, có người chuyển token, hoặc copy trade được kích hoạt.
          </Text>
        </View>
      ) : (
        notifications.map(item => {
          const meta = TYPE_META[item.type] || { icon: 'bell', label: 'Hệ thống' };
          return (
            <View key={item.id} style={[styles.card, !item.read && styles.cardUnread]}>
              <AppIcon name={meta.icon} size={18} color={colors.textDim} />
              <View style={{ flex: 1 }}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
                <View style={styles.cardFoot}>
                  <Text style={styles.typeTag}>{meta.label}</Text>
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
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minWidth: 60, minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  markAllAction: { minWidth: touch.min, minHeight: touch.min, justifyContent: 'center', alignItems: 'flex-end' },
  markAll: { color: colors.accentSoft, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  unreadLine: { color: colors.textDim, fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: colors.warningDim, borderWidth: 1, borderColor: colors.warningBorder, minHeight: touch.min },
  streakTitle: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  streakText: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  emptyText: { color: colors.textFaint, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  card: { flexDirection: 'row', gap: 10, backgroundColor: colors.surface, borderRadius: 10, marginHorizontal: 16, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  cardUnread: { borderColor: colors.accentBorder, backgroundColor: colors.accentDim },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentStrong },
  cardBody: { color: colors.textDim, fontSize: 12, lineHeight: 17, marginTop: 3 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  typeTag: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  time: { color: colors.textFaint, fontSize: 12 },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});

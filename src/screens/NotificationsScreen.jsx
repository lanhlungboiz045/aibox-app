// screens/NotificationsScreen.jsx — Trung tâm thông báo (mock push in-app)
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppIcon } from '../components/ui/AppIcon';
import { AppHeader, Button } from '../components/ui';
import { formatRelativeTime, formatToken } from '../utils/format';
import { colors, centeredContent, touch } from '../theme/tokens';

const TYPE_META = {
  TRANSFER_IN: { icon: 'credit-card', label: 'Chuyển token' },
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
      stickyHeaderIndices={[0]}
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 24 }]}
    >
      <AppHeader navigation={navigation} title="Thông báo" />
      <View style={styles.markAllRow}>
        <Button label="Đọc tất cả" variant={unreadNotifications ? 'secondary' : 'disabled'} disabled={unreadNotifications === 0} onPress={markNotificationsRead} />
      </View>

      {unreadNotifications > 0 && (
        <Text style={styles.unreadLine}>{unreadNotifications} thông báo chưa đọc</Text>
      )}

      {canClaimDaily && (
        <TouchableOpacity accessibilityRole="button" style={styles.streakCard} onPress={() => navigation.navigate('Quests')}>
          <AppIcon name="gift" size={20} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Chuỗi ngày của bạn sắp bị gián đoạn!</Text>
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
            Thông báo về token nhận được và hoạt động tài khoản sẽ hiện ở đây.
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  markAllRow: { alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
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
});

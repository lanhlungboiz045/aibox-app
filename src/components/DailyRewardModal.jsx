// components/DailyRewardModal.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { DAILY_REWARD_STREAK_BONUS, DAILY_REWARD_BONUS_AT_STREAK } from '../utils/rewards';

export function DailyRewardModal({ visible, onClose }) {
  const { state, claimDailyReward, canClaimDaily, nextStreak, nextDailyReward } = useApp();
  const insets = useSafeAreaInsets();

  const handleClaim = () => {
    claimDailyReward();
    setTimeout(onClose, 500);
  };

  const todayClaimed = !canClaimDaily;
  // Số thưởng lấy từ context (cùng công thức với reducer) thay vì tự tính lại
  const reward = nextDailyReward;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.card}>
          <Text style={styles.icon}>{'\u{1F381}'}</Text>
          <Text style={styles.title}>Thưởng hàng ngày!</Text>
          {!todayClaimed ? (
            <>
              <Text style={styles.amount}>{formatToken(reward)} token miễn phí</Text>
              {nextStreak > 1 && (
                <Text style={styles.streak}>{'\u{1F525}'} Streak {nextStreak} ngày</Text>
              )}
              {nextStreak >= DAILY_REWARD_BONUS_AT_STREAK && (
                <Text style={styles.bonus}>(+{formatToken(DAILY_REWARD_STREAK_BONUS)} bonus streak {DAILY_REWARD_BONUS_AT_STREAK} ngày!)</Text>
              )}
              <Text style={styles.hint}>Quay lại mỗi ngày để nhận thưởng và giữ streak!</Text>
              <TouchableOpacity style={styles.claimBtn} onPress={handleClaim}>
                <Text style={styles.claimBtnText}>Nhận ngay {'\u{1F4B0}'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.claimedText}>Bạn đã nhận thưởng hôm nay!</Text>
              <Text style={styles.hint}>Quay lại sau 24h để nhận tiếp. {'\u{1F525}'} Streak: {state.user.dailyStreak} ngày</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  card: { backgroundColor: '#1A1D24', borderRadius: 20, padding: 28, alignItems: 'center', width: '85%', borderWidth: 1, borderColor: '#2A2E36' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  amount: { color: '#FFB74D', fontSize: 22, fontWeight: '700', fontFamily: 'monospace', marginBottom: 4 },
  streak: { color: '#FF6B6B', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  bonus: { color: '#00CE7E', fontSize: 12, marginBottom: 12 },
  hint: { color: '#8E8E93', fontSize: 12, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  claimBtn: { backgroundColor: '#FFB74D', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  claimBtnText: { color: '#1A1D24', fontSize: 15, fontWeight: '700' },
  claimedText: { color: '#8E8E93', fontSize: 16, marginBottom: 8 },
  closeBtn: { backgroundColor: '#22262E', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36' },
  closeBtnText: { color: '#8E8E93', fontSize: 14 },
});

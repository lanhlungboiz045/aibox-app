// screens/TaiXiuScreen.jsx — Game Tài xỉu (3 xúc xắc) để cá cược token nội bộ
//
// Luật nằm ở src/utils/taiXiu.js, tiền được tính trong reducer PLACE_TAIXIU_BET
// (AppContext) để token và lịch sử luôn khớp. Màn này chỉ lo UI:
// 3 xúc xắc + kết quả, thống kê, chọn mức cược, 2 nút TÀI/XỈU, 12 ván gần nhất.
//
// Token ở đây là credit nội bộ của app demo: không nạp/rút bằng tiền thật,
// không đổi ra tiền. RNG chạy trên máy nên kết quả chỉ mang tính giải trí.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, Easing, TouchableOpacity, AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TokenBadge } from '../components/TokenBadge';
import { Die } from '../components/Die';
import {
  AppIcon, ErrorState, IconButton, OfflineBar, useToast,
} from '../components/ui';
import { AppDrawer } from '../components/AppDrawer';
import { useAppDrawer } from '../hooks/useAppDrawer';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { formatToken, formatRelativeTime } from '../utils/format';
import { hapticError, hapticPress, hapticSuccess } from '../utils/feedback';
import {
  MIN_STAKE, MAX_STAKE, STAKE_STEP, STAKE_PRESETS, SIDES, SIDE_LABELS, SIDE_RANGES,
  clampStake, rollDice,
} from '../utils/taiXiu';
import { colors, centeredContent, layout, radius, spacing, touch, type } from '../theme/tokens';
import { t } from '../i18n';

// Số ván hiển thị ở dải lịch sử nhanh
const RECENT_LIMIT = 12;

export function TaiXiuScreen({ navigation }) {
  const { state, placeTaiXiuBet } = useApp();
  const insets = useSafeAreaInsets();
  const { open: openDrawer, drawerProps } = useAppDrawer();
  const toast = useToast();
  const reduceMotion = useReduceMotion();
  const { isOffline, refresh: refreshNetwork } = useNetworkStatus();

  const [stake, setStake] = useState(50);
  const [faces, setFaces] = useState([1, 1, 1]); // mặt đang hiển thị (lúc lắc thì nhảy số)
  const [rolling, setRolling] = useState(false);

  const spin = useRef(new Animated.Value(0)).current;
  const rollTimer = useRef(null);
  const spinTimer = useRef(null);

  const balance = state.user?.tokenBalance || 0;
  const stakeAmount = clampStake(stake, balance);
  const maxStake = Math.min(MAX_STAKE, balance);
  const canBet = stakeAmount >= MIN_STAKE && !rolling;

  // Lịch sử/thống kê suy ra từ transactions type 'TAIXIU' → không cần field mới
  const rounds = (state.user?.transactions || []).filter(tx => tx.type === 'TAIXIU');
  const latest = rounds[0] || null;
  const played = rounds.length;
  const wins = rounds.filter(tx => (tx.amount || 0) > 0).length;
  const winRate = played ? Math.round((wins / played) * 100) : 0;
  const net = rounds.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const recent = rounds.slice(0, RECENT_LIMIT);

  // Dọn timer khi rời màn (tránh setState sau khi unmount)
  useEffect(() => () => {
    if (rollTimer.current) clearInterval(rollTimer.current);
    if (spinTimer.current) clearTimeout(spinTimer.current);
  }, []);

  // Công bố kết quả: gọi action (quay + áp luật trong reducer) rồi báo bằng
  // toast + haptic + trình đọc màn hình.
  const settle = useCallback((side, amount) => {
    if (rollTimer.current) { clearInterval(rollTimer.current); rollTimer.current = null; }
    if (spinTimer.current) { clearTimeout(spinTimer.current); spinTimer.current = null; }

    const result = placeTaiXiuBet({ side, stake: amount });
    setRolling(false);
    if (!result.ok) {
      hapticError();
      toast.error(result.error || 'Không đặt cược được.');
      return;
    }

    setFaces(result.dice);
    const diceText = result.dice.join('-');
    if (result.triple) {
      hapticError();
      toast.warning(`Bộ ba ${diceText} — nhà cái ăn cả 2 cửa.`);
      AccessibilityInfo.announceForAccessibility?.(`Bộ ba ${result.dice.join(', ')}. Bạn mất ${amount} token.`);
    } else if (result.win) {
      hapticSuccess();
      toast.success(`Thắng +${formatToken(amount)} token · tổng ${result.total}`);
      AccessibilityInfo.announceForAccessibility?.(`Thắng ${amount} token. Tổng ${result.total}.`);
    } else {
      hapticError();
      toast.info(`Thua ${formatToken(amount)} token · tổng ${result.total}`);
      AccessibilityInfo.announceForAccessibility?.(`Thua ${amount} token. Tổng ${result.total}.`);
    }
  }, [placeTaiXiuBet, toast]);

  // 1 chạm đặt cược: lắc ~700ms rồi công bố (bỏ animation nếu máy bật giảm chuyển động)
  const play = useCallback((side) => {
    if (rolling) return;
    const amount = clampStake(stake, balance);
    if (amount < MIN_STAKE) {
      hapticError();
      toast.error(`Cần tối thiểu ${MIN_STAKE} token để cược.`);
      return;
    }

    hapticPress();
    setStake(amount);
    setRolling(true);

    if (reduceMotion) {
      settle(side, amount);
      return;
    }

    rollTimer.current = setInterval(() => setFaces(rollDice()), 90);
    spinTimer.current = setTimeout(() => settle(side, amount), 700);
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [balance, reduceMotion, rolling, settle, spin, stake, toast]);

  const changeStake = (delta) => {
    if (rolling) return;
    const next = clampStake((stakeAmount || MIN_STAKE) + delta, balance);
    if (!next) return;
    hapticPress();
    setStake(next);
  };

  const pickStake = (value) => {
    if (rolling) return;
    hapticPress();
    setStake(value);
  };

  // Xúc xắc đang hiển thị: lúc lắc lấy mặt ngẫu nhiên, còn lại lấy ván gần nhất
  const shown = rolling ? faces : (latest?.dice || [1, 2, 3]);
  const diceTone = rolling || !latest
    ? 'normal'
    : (latest.amount || 0) > 0 ? 'win' : 'lose';

  const animatedStyle = {
    transform: [
      {
        translateY: spin.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0, -12, 0, -8, 0],
        }),
      },
      {
        rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }),
      },
    ],
  };

  // Câu kết quả 1 dòng
  let bannerTone = 'muted';
  let bannerText = 'Chọn cửa rồi bấm TÀI hoặc XỈU để bắt đầu.';
  if (rolling) {
    bannerText = 'Đang lắc xúc xắc…';
  } else if (latest) {
    const diceText = (latest.dice || []).join('-');
    if (latest.triple) {
      bannerTone = 'warning';
      bannerText = `Bộ ba ${diceText} · tổng ${latest.total} → nhà cái ăn cả 2 cửa`;
    } else {
      const isWin = (latest.amount || 0) > 0;
      bannerTone = isWin ? 'success' : 'danger';
      const outcome = latest.total >= 11 ? 'TÀI' : 'XỈU';
      bannerText = `${diceText} · tổng ${latest.total} → ${outcome} · ${isWin ? `thắng +${formatToken(latest.amount)}` : `thua ${formatToken(Math.abs(latest.amount || 0))}`}`;
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <IconButton icon="menu" label={t('nav.openMenu')} size={22} onPress={openDrawer} />
          <View style={styles.headerBody}>
            <Text style={styles.title} maxFontSizeMultiplier={1.6}>{t('screen.taixiu')}</Text>
            <Text style={styles.headerMeta} numberOfLines={1} maxFontSizeMultiplier={1.5}>
              Cược token nội bộ · trả 1 ăn 1
            </Text>
          </View>
          <TokenBadge size="medium" />
        </View>
      </View>

      {isOffline ? (
        <OfflineBar onRetry={refreshNetwork} style={styles.offlineBar} />
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[centeredContent, styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Bàn chơi: 3 xúc xắc + banner kết quả ── */}
        <View style={styles.tableCard}>
          <View style={styles.tableTop}>
            <View style={styles.tableTag}>
              <AppIcon name="target" size={12} color={colors.accentSoft} />
              <Text style={styles.tableTagText} maxFontSizeMultiplier={1.5}>Tài xỉu 3 xúc xắc</Text>
            </View>
            <Text style={styles.roundsText} maxFontSizeMultiplier={1.5}>
              {played > 0 ? `Ván thứ ${played + 1}` : 'Ván đầu tiên'}
            </Text>
          </View>

          <Animated.View
            style={[styles.diceRow, animatedStyle]}
            accessible
            accessibilityLabel={
              rolling
                ? 'Đang lắc xúc xắc'
                : `Xúc xắc ${shown.join(', ')}, tổng ${shown.reduce((s, v) => s + v, 0)}`
            }
          >
            {[0, 1, 2].map(index => (
              <Die key={index} value={shown[index] || 1} size={64} tone={diceTone} />
            ))}
          </Animated.View>

          <View
            style={[
              styles.banner,
              bannerTone === 'success' && styles.bannerSuccess,
              bannerTone === 'danger' && styles.bannerDanger,
              bannerTone === 'warning' && styles.bannerWarning,
            ]}
            accessibilityLiveRegion="polite"
          >
            <Text
              style={[
                styles.bannerText,
                bannerTone === 'success' && { color: colors.success },
                bannerTone === 'danger' && { color: colors.danger },
                bannerTone === 'warning' && { color: colors.warning },
              ]}
              maxFontSizeMultiplier={1.6}
            >
              {bannerText}
            </Text>
          </View>
        </View>

        {/* ── Thống kê suy ra từ lịch sử cược ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} maxFontSizeMultiplier={1.5}>Số ván</Text>
            <Text style={styles.statValue} maxFontSizeMultiplier={1.5}>{formatToken(played)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} maxFontSizeMultiplier={1.5}>Thắng</Text>
            <Text style={styles.statValue} maxFontSizeMultiplier={1.5}>{formatToken(wins)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} maxFontSizeMultiplier={1.5}>Tỉ lệ thắng</Text>
            <Text style={styles.statValue} maxFontSizeMultiplier={1.5}>{winRate}%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} maxFontSizeMultiplier={1.5}>Lãi ròng</Text>
            <Text
              style={[styles.statValue, { color: net > 0 ? colors.success : net < 0 ? colors.danger : colors.text }]}
              maxFontSizeMultiplier={1.5}
            >
              {net > 0 ? '+' : ''}{formatToken(net)}
            </Text>
          </View>
        </View>

        {/* ── Không đủ token tối thiểu: chỉ đường nạp, không chặn xem luật ── */}
        {stakeAmount < MIN_STAKE ? (
          <ErrorState
            compact
            title="Không đủ token để cược"
            message={`Cần tối thiểu ${MIN_STAKE} token cho mỗi ván. Nạp thêm để chơi tiếp.`}
            retryLabel={t('common.topup')}
            onRetry={() => navigation.navigate('CreditsTopup')}
          />
        ) : null}

        {/* ── Chọn mức cược ── */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.6}>Mức cược</Text>
            <Text style={styles.sectionHint} maxFontSizeMultiplier={1.5}>
              {formatToken(MIN_STAKE)}–{formatToken(MAX_STAKE)} · bước {STAKE_STEP}
            </Text>
          </View>

          <View style={styles.stepper}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Giảm ${STAKE_STEP} token`}
              accessibilityState={{ disabled: stakeAmount <= MIN_STAKE || rolling }}
              disabled={stakeAmount <= MIN_STAKE || rolling}
              onPress={() => changeStake(-STAKE_STEP)}
              hitSlop={touch.hitSlop}
              style={[styles.stepBtn, (stakeAmount <= MIN_STAKE || rolling) && styles.stepBtnDisabled]}
            >
              <AppIcon name="minus" size={18} color={stakeAmount <= MIN_STAKE ? colors.textFaint : colors.text} />
            </TouchableOpacity>

            <View style={styles.stepValue}>
              <Text style={styles.stakeValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.4}>
                {formatToken(stakeAmount)}
              </Text>
              <Text style={styles.stakeUnit} maxFontSizeMultiplier={1.5}>token / ván</Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Tăng ${STAKE_STEP} token`}
              accessibilityState={{ disabled: stakeAmount >= maxStake || rolling }}
              disabled={stakeAmount >= maxStake || rolling}
              onPress={() => changeStake(STAKE_STEP)}
              hitSlop={touch.hitSlop}
              style={[styles.stepBtn, (stakeAmount >= maxStake || rolling) && styles.stepBtnDisabled]}
            >
              <AppIcon name="plus" size={18} color={stakeAmount >= maxStake ? colors.textFaint : colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.presets}>
            {STAKE_PRESETS.map(value => {
              const active = stakeAmount === value;
              const disabled = value > balance || rolling;
              return (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Cược ${formatToken(value)} token`}
                  accessibilityState={{ selected: active, disabled }}
                  disabled={disabled}
                  onPress={() => pickStake(value)}
                  hitSlop={touch.hitSlop}
                  style={[styles.preset, active && styles.presetActive, disabled && styles.presetDisabled]}
                >
                  <Text
                    style={[styles.presetText, active && styles.presetTextActive, disabled && styles.presetTextDisabled]}
                    maxFontSizeMultiplier={1.5}
                  >
                    {formatToken(value)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 2 nút cược lớn ── */}
        <View style={styles.betRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Đặt ${formatToken(stakeAmount || 0)} token cửa Tài, tổng ${SIDE_RANGES.TAI}`}
            accessibilityState={{ disabled: !canBet }}
            disabled={!canBet}
            onPress={() => play(SIDES.TAI)}
            activeOpacity={0.85}
            style={[styles.betBtn, styles.betTai, !canBet && styles.betDisabled]}
          >
            <Text style={[styles.betLabel, { color: colors.danger }]} maxFontSizeMultiplier={1.6}>TÀI</Text>
            <Text style={styles.betRange} maxFontSizeMultiplier={1.5}>tổng {SIDE_RANGES.TAI}</Text>
            <Text style={styles.betOdd} maxFontSizeMultiplier={1.5}>1 ăn 1</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Đặt ${formatToken(stakeAmount || 0)} token cửa Xỉu, tổng ${SIDE_RANGES.XIU}`}
            accessibilityState={{ disabled: !canBet }}
            disabled={!canBet}
            onPress={() => play(SIDES.XIU)}
            activeOpacity={0.85}
            style={[styles.betBtn, styles.betXiu, !canBet && styles.betDisabled]}
          >
            <Text style={[styles.betLabel, { color: colors.success }]} maxFontSizeMultiplier={1.6}>XỈU</Text>
            <Text style={styles.betRange} maxFontSizeMultiplier={1.5}>tổng {SIDE_RANGES.XIU}</Text>
            <Text style={styles.betOdd} maxFontSizeMultiplier={1.5}>1 ăn 1</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.betNote} maxFontSizeMultiplier={1.6}>
          Mỗi lần bấm là 1 ván: thắng cộng {formatToken(stakeAmount || MIN_STAKE)} token, thua trừ {formatToken(stakeAmount || MIN_STAKE)} token.
          Bộ ba (111–666) nhà cái ăn cả 2 cửa.
        </Text>

        {/* ── 12 ván gần nhất ── */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.6}>Ván gần nhất</Text>
            <View style={styles.cardHeadRight}>
              <AppIcon name="clock" size={12} color={colors.textFaint} />
              <Text style={styles.sectionHint} maxFontSizeMultiplier={1.5}>{recent.length}/{RECENT_LIMIT}</Text>
            </View>
          </View>

          {recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.6}>Chưa có ván nào</Text>
              <Text style={styles.emptyText} maxFontSizeMultiplier={1.6}>
                Kết quả 12 ván gần nhất sẽ hiện ở đây, kèm tổng điểm và cửa đã đặt.
              </Text>
            </View>
          ) : (
            <View style={styles.historyGrid}>
              {recent.map(tx => {
                const isWin = (tx.amount || 0) > 0;
                return (
                  <View
                    key={tx.id}
                    style={[styles.historyItem, isWin ? styles.historyWin : styles.historyLose]}
                    accessibilityLabel={`${tx.description}. ${formatRelativeTime(tx.timestamp)}`}
                  >
                    <Text
                      style={[styles.historyDice, { color: isWin ? colors.success : colors.danger }]}
                      maxFontSizeMultiplier={1.4}
                    >
                      {(tx.dice || []).join('-')}
                    </Text>
                    <Text style={styles.historyMeta} maxFontSizeMultiplier={1.4}>
                      {tx.triple ? 'bộ ba' : `tổng ${tx.total}`} · {SIDE_LABELS[tx.side] || '—'}
                    </Text>
                    <Text
                      style={[styles.historyAmount, { color: isWin ? colors.success : colors.danger }]}
                      maxFontSizeMultiplier={1.4}
                    >
                      {isWin ? '+' : ''}{formatToken(tx.amount || 0)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Luật công khai + disclaimer ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.6}>Luật chơi</Text>
          <View style={styles.ruleList}>
            <View style={styles.ruleRow}>
              <AppIcon name="info" size={14} color={colors.textFaint} />
              <Text style={styles.ruleText} maxFontSizeMultiplier={1.6}>
                3 xúc xắc, mỗi mặt 1–6. Tổng 4–10 là XỈU, 11–17 là TÀI.
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <AppIcon name="info" size={14} color={colors.textFaint} />
              <Text style={styles.ruleText} maxFontSizeMultiplier={1.6}>
                Đặt đúng cửa: thắng +1 lần cược, sai: −1 lần cược. Không có cửa hoà.
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <AppIcon name="info" size={14} color={colors.textFaint} />
              <Text style={styles.ruleText} maxFontSizeMultiplier={1.6}>
                Bộ ba 111–666 (tổng 3 hoặc 18) nhà cái ăn cả 2 cửa — đây là lợi thế duy nhất
                của nhà cái: 6/216 ván (2,78%).
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <AppIcon name="info" size={14} color={colors.textFaint} />
              <Text style={styles.ruleText} maxFontSizeMultiplier={1.6}>
                Kết quả do máy quay ngẫu nhiên khi bạn bấm cược, không phải kết quả casino hay
                xổ số thật.
              </Text>
            </View>
          </View>

          <View style={styles.disclaimer}>
            <AppIcon name="alert-triangle" size={14} color={colors.warning} />
            <Text style={styles.disclaimerText} maxFontSizeMultiplier={1.6}>
              Dành cho người từ 18 tuổi. Token là credit nội bộ của app demo, không nạp/rút bằng
              tiền thật và không đổi được ra tiền. Chơi có trách nhiệm.
            </Text>
          </View>
        </View>
      </ScrollView>

      <AppDrawer {...drawerProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInner: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  headerBody: { flex: 1, gap: 2 },
  title: { ...type.h1, color: colors.text },
  headerMeta: { ...type.small, color: colors.textFaint },
  offlineBar: { marginHorizontal: layout.gutter, marginTop: spacing.sm },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    gap: layout.sectionGap,
  },

  // ── Bàn chơi ──
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  tableTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  tableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  tableTagText: { ...type.smallStrong, color: colors.accentSoft },
  roundsText: { ...type.small, color: colors.textFaint },
  diceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  banner: {
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  bannerSuccess: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  bannerDanger: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  bannerWarning: { backgroundColor: colors.warningDim, borderColor: colors.warningBorder },
  bannerText: { ...type.bodyStrong, color: colors.textDim, textAlign: 'center' },

  // ── Thống kê ──
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 76,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  statLabel: { ...type.small, color: colors.textFaint },
  statValue: { ...type.subtitle, color: colors.text, fontFamily: 'monospace' },

  // ── Card chung ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { ...type.section, color: colors.text },
  sectionHint: { ...type.small, color: colors.textFaint },

  // ── Chọn mức cược ──
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.xs,
  },
  stepBtn: {
    width: touch.iconButton,
    height: touch.iconButton,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  stepBtnDisabled: { opacity: 0.6 },
  stepValue: { flex: 1, alignItems: 'center', gap: 1 },
  stakeValue: { ...type.h1, color: colors.text, fontFamily: 'monospace' },
  stakeUnit: { ...type.small, color: colors.textFaint },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    flex: 1,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceAlt,
  },
  presetActive: { backgroundColor: colors.accentDim, borderColor: colors.accentBorder },
  presetDisabled: { opacity: 0.5 },
  presetText: { ...type.bodyStrong, color: colors.textDim, fontFamily: 'monospace' },
  presetTextActive: { color: colors.accentSoft },
  presetTextDisabled: { color: colors.textFaint },

  // ── Nút cược ──
  betRow: { flexDirection: 'row', gap: spacing.md },
  betBtn: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
  },
  betTai: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  betXiu: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  betDisabled: { opacity: 0.55 },
  betLabel: { fontSize: type.h1.fontSize, lineHeight: type.h1.lineHeight, fontWeight: '800', letterSpacing: 0.5 },
  betRange: { ...type.small, color: colors.textDim },
  betOdd: { ...type.smallStrong, color: colors.textFaint },
  betNote: { ...type.small, color: colors.textFaint, lineHeight: 18, marginTop: -spacing.sm },

  // ── Lịch sử ──
  emptyBox: { gap: spacing.xs, paddingVertical: spacing.sm },
  emptyTitle: { ...type.bodyStrong, color: colors.textDim },
  emptyText: { ...type.small, color: colors.textFaint, lineHeight: 18 },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyItem: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 88,
    gap: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  historyWin: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  historyLose: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  historyDice: { ...type.bodyStrong, fontFamily: 'monospace' },
  historyMeta: { ...type.small, color: colors.textDim },
  historyAmount: { ...type.smallStrong, fontFamily: 'monospace' },

  // ── Luật chơi ──
  ruleList: { gap: spacing.sm },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  ruleText: { ...type.body, color: colors.textDim, flex: 1 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningDim,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  disclaimerText: { ...type.small, color: colors.warning, flex: 1, lineHeight: 18 },
});

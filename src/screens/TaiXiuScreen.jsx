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
  View, Text, TextInput, ScrollView, StyleSheet, Animated, Easing, Pressable, TouchableOpacity, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, MAX_TRANSACTIONS } from '../context/AppContext';
import { TokenBadge } from '../components/TokenBadge';
import { Die } from '../components/Die';
import {
  AppIcon, BottomSheet, Button, ErrorState, IconButton, OfflineBar, useToast,
} from '../components/ui';
import { AppDrawer } from '../components/AppDrawer';
import { useAppDrawer } from '../hooks/useAppDrawer';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { formatToken, formatRelativeTime } from '../utils/format';
import { chatsRange } from '../utils/economy';
import { hapticError, hapticPress, hapticTap } from '../utils/feedback';
import {
  MIN_STAKE, STAKE_PRESETS, SIDES, SIDE_LABELS, SIDE_RANGES, getStakePayouts,
  getValidStake, maxStakeForBalance, rollDice,
} from '../utils/taiXiu';
import { colors, centeredContent, layout, radius, spacing, touch, type } from '../theme/tokens';
import { t } from '../i18n';

// Số ván hiển thị ở dải lịch sử nhanh
const RECENT_LIMIT = 12;

// Cược từ 1.000 token trở lên hoặc cược toàn bộ số dư cần xác nhận rõ ràng.
const CONFIRM_FROM = 1000;

export function TaiXiuScreen({ navigation }) {
  const { state, placeTaiXiuBet } = useApp();
  const insets = useSafeAreaInsets();
  const { open: openDrawer, drawerProps } = useAppDrawer();
  const toast = useToast();
  const reduceMotion = useReduceMotion();
  const { isOffline, refresh: refreshNetwork } = useNetworkStatus();

  const [stakeInput, setStakeInput] = useState('500');
  const [faces, setFaces] = useState([1, 1, 1]); // mặt đang hiển thị (lúc lắc thì nhảy số)
  const [rolling, setRolling] = useState(false);
  // Cửa đang chờ xác nhận (cược lớn hoặc tất tay) — null = không mở bảng
  const [confirmSide, setConfirmSide] = useState(null);

  const spin = useRef(new Animated.Value(0)).current;
  const rollTimer = useRef(null);
  const spinTimer = useRef(null);

  const balance = state.user?.tokenBalance || 0;
  const parsedStake = stakeInput === '' ? null : Number(stakeInput);
  const stakeAmount = getValidStake(parsedStake, balance);
  const maxStake = maxStakeForBalance(balance);
  const hasStake = stakeAmount > 0;
  const stakePayouts = getStakePayouts(stakeAmount);
  const stakeError = stakeInput === ''
    ? null
    : !Number.isSafeInteger(parsedStake)
      ? 'Nhập một số token nguyên hợp lệ.'
      : parsedStake < MIN_STAKE
        ? `Mức cược tối thiểu là ${formatToken(MIN_STAKE)} token.`
        : parsedStake > balance
          ? 'Mức cược vượt số dư token hiện tại.'
          : parsedStake > maxStake
            ? 'Mức cược quá lớn để xử lý an toàn.'
            : null;
  const canBet = hasStake && !rolling;
  const needsConfirm = stakeAmount >= CONFIRM_FROM || (hasStake && stakeAmount === balance);
  // Lịch sử bị cắt ở MAX_TRANSACTIONS → thống kê chỉ đúng trong cửa sổ đó
  const capped = (state.user?.transactions || []).length >= MAX_TRANSACTIONS;

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
  // toast + haptic. Toast là kênh thông báo DUY NHẤT (banner không đặt
  // liveRegion) nên TalkBack chỉ đọc kết quả 1 lần.
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

    setFaces(result.dice || [1, 1, 1]);
    const diceText = (result.dice || []).join('-');
    // Số dư sau ván: reducer đã cộng/trừ, ở đây tính lại để toast nói con số
    // người chơi cần biết (số dư), không phải tổng xúc xắc.
    const after = balance + (result.net || 0);
    if (result.win) {
      // Toast success đã rung mừng → không rung thêm lần nữa
      const resultLabel = result.triple ? `Bộ ba ${diceText} · thưởng +${formatToken(result.net)}` : `Thắng +${formatToken(result.net)}`;
      toast.success(`${resultLabel} · số dư ${formatToken(after)}`);
    } else {
      // Thua là kết quả hợp lệ, không phải lỗi hệ thống → rung nhẹ
      hapticTap();
      toast.info(`Thua ${formatToken(amount)} · số dư ${formatToken(after)}`, { duration: 2000 });
    }
  }, [balance, placeTaiXiuBet, toast]);

  // Sau xác nhận nếu cần: lắc ~700ms rồi công bố (bỏ animation khi giảm chuyển động)
  const play = useCallback((side) => {
    if (rolling) return;
    Keyboard.dismiss();
    const amount = stakeAmount;
    if (!amount) {
      hapticError();
      toast.error(stakeError || `Cần tối thiểu ${MIN_STAKE} token để cược.`);
      return;
    }

    hapticPress();
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
  }, [reduceMotion, rolling, settle, spin, stakeAmount, stakeError, toast]);

  const pickStake = (value) => {
    if (rolling) return;
    Keyboard.dismiss();
    hapticPress();
    setStakeInput(String(value));
  };

  // Mức cược lớn hoặc tất tay mở bảng xác nhận trước khi đặt.
  const pressBet = (side) => {
    if (!canBet) return;
    Keyboard.dismiss();
    if (needsConfirm) {
      hapticTap();
      setConfirmSide(side);
      return;
    }
    play(side);
  };

  const confirmBet = () => {
    const side = confirmSide;
    setConfirmSide(null);
    if (!side) return;
    play(side);
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

  // Câu kết quả 1 dòng. Số (tổng, token) dùng font mono để cột số thẳng hàng.
  let bannerTone = 'muted';
  let bannerNode = 'Chọn cửa rồi bấm TÀI hoặc XỈU để bắt đầu.';
  if (rolling) {
    bannerNode = 'Đang lắc xúc xắc…';
  } else if (latest) {
    const diceText = (latest.dice || []).join('-');
    const totalNode = <Text style={styles.num}>{latest.total}</Text>;
    const amountNode = (
      <Text style={styles.num}>{formatToken(Math.abs(latest.amount || 0))}</Text>
    );
    if (latest.triple) {
      bannerTone = 'success';
      bannerNode = (
        <>
          {`Bộ ba ${diceText} · tổng `}{totalNode}{' → thưởng +'}{amountNode}
        </>
      );
    } else {
      const isWin = (latest.amount || 0) > 0;
      bannerTone = isWin ? 'success' : 'danger';
      const outcome = latest.total >= 11 ? 'TÀI' : 'XỈU';
      bannerNode = (
        <>
          {`${diceText} · tổng `}{totalNode}{` → ${outcome} · ${isWin ? 'thắng +' : 'thua '}`}{amountNode}
        </>
      );
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
              Token nội bộ · không đổi ra tiền
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
        contentContainerStyle={[centeredContent, styles.content, { paddingBottom: spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Bàn chơi: 3 xúc xắc + banner kết quả + dải thống kê 1 dòng ── */}
        <View style={styles.tableCard}>
          <Text style={styles.roundsText} maxFontSizeMultiplier={1.5}>
            {played > 0 ? `Ván thứ ${played + 1}` : 'Ván đầu tiên'}
          </Text>

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
              {bannerNode}
            </Text>
          </View>

          {/* Thống kê suy ra từ lịch sử cược: 1 dòng, không cạnh tranh với bàn chơi */}
          <View style={styles.statsLine}>
            {played > 0 ? (
              <Text style={styles.statsText} maxFontSizeMultiplier={1.5}>
                {`${capped ? `${played}+ ván gần nhất` : `${played} ván`} · ${winRate}% thắng · `}
                <Text
                  style={[
                    styles.num,
                    { color: net > 0 ? colors.success : net < 0 ? colors.danger : colors.textDim },
                  ]}
                >
                  {`${net > 0 ? '+' : ''}${formatToken(net)} ${net > 0 ? 'lãi' : net < 0 ? 'lỗ' : 'hoà'}`}
                </Text>
              </Text>
            ) : (
              <Text style={styles.statsText} maxFontSizeMultiplier={1.5}>
                Chưa có ván nào — luật chơi ở cuối màn.
              </Text>
            )}
          </View>
        </View>

        {/* ── Không đủ token tối thiểu: chỉ đường nạp, không chặn xem luật ── */}
        {balance < MIN_STAKE ? (
          <ErrorState
            compact
            title="Không đủ token để cược"
            message={`Cần tối thiểu ${formatToken(MIN_STAKE)} token cho mỗi ván. Nạp thêm để chơi tiếp.`}
            retryLabel={t('common.topup')}
            onRetry={() => navigation.navigate('CreditsTopup')}
          />
        ) : null}

        {/* ── 12 ván gần nhất ── */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.6}>Ván gần nhất</Text>
          </View>

          {recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.6}>Chưa có ván nào</Text>
              <Text style={styles.emptyText} maxFontSizeMultiplier={1.6}>
                Kết quả các ván sẽ hiện ở đây, kèm tổng điểm và cửa đã đặt.
              </Text>
            </View>
          ) : (
            <View style={styles.historyGrid}>
              {recent.map(tx => {
                const isWin = (tx.amount || 0) > 0;
                return (
                  <View
                    key={tx.id}
                    accessible
                    style={[styles.historyItem, isWin ? styles.historyWin : styles.historyLose]}
                    accessibilityLabel={`Xúc xắc ${(tx.dice || []).join(', ')}, ${tx.triple ? 'bộ ba' : `tổng ${tx.total}`}, cửa ${SIDE_LABELS[tx.side] || '—'}, ${isWin ? 'thắng' : 'thua'} ${formatToken(Math.abs(tx.amount || 0))} token, ${formatRelativeTime(tx.timestamp)}`}
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
                Cược tối thiểu {formatToken(MIN_STAKE)} token, không có trần cố định; mức cược không vượt số dư.
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <AppIcon name="info" size={14} color={colors.textFaint} />
              <Text style={styles.ruleText} maxFontSizeMultiplier={1.6}>
                {`Đúng cửa: lãi 0,96× cược; sai cửa: mất cược. Thưởng làm tròn xuống token nguyên.${hasStake ? ` Với mức hiện tại: +${formatToken(stakePayouts.sideWin)} hoặc −${formatToken(stakeAmount)} token.` : ''}`}
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <AppIcon name="info" size={14} color={colors.textFaint} />
              <Text style={styles.ruleText} maxFontSizeMultiplier={1.6}>
                Bộ ba 111–666 (6/216 ván, 2,78%) thắng bất kể cửa đã đặt, nhận lãi gấp 2 lần cược
                {hasStake ? ` (+${formatToken(stakePayouts.tripleWin)} token với mức hiện tại).` : '.'}
                {' Mức thưởng này khiến kỳ vọng toán học nghiêng về người chơi.'}
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

      {/* ── Thanh cược cố định ở đáy: mức cược + 2 cửa, luôn trong tầm ngón cái ── */}
      <View style={[styles.betBar, centeredContent, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.betBarHead}>
          {hasStake ? (
            <>
              <Text style={styles.betBarLabel} maxFontSizeMultiplier={1.4}>
                Mức cược <Text style={styles.betBarValue}>{formatToken(stakeAmount)}</Text>
              </Text>
              <Text style={styles.betBarHint} maxFontSizeMultiplier={1.4}>
                ≈ {chatsRange(stakeAmount)} câu hỏi AI
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.betBarLabel} maxFontSizeMultiplier={1.4}>
                Chưa có mức cược hợp lệ
              </Text>
              <Text style={styles.betBarHint} maxFontSizeMultiplier={1.4}>
                {`Số dư ${formatToken(balance)} token`}
              </Text>
            </>
          )}
        </View>

        <View style={styles.customStakeRow}>
          <View style={styles.customStakeBody}>
            <Text style={styles.customStakeLabel} maxFontSizeMultiplier={1.4}>Mức cược tùy chỉnh</Text>
            <View style={[styles.customStakeField, Boolean(stakeError) && styles.customStakeFieldError]}>
              <TextInput
                style={styles.customStakeInput}
                value={stakeInput}
                onChangeText={value => setStakeInput(value.replace(/\D/g, ''))}
                placeholder="Nhập số token"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                editable={!rolling}
                accessibilityLabel="Mức cược tùy chỉnh, token"
                accessibilityHint={maxStake >= MIN_STAKE
                  ? `Nhập từ ${formatToken(MIN_STAKE)} đến ${formatToken(maxStake)} token`
                  : `Cần số dư tối thiểu ${formatToken(MIN_STAKE)} token`}
                maxFontSizeMultiplier={1.6}
              />
              <Text style={styles.customStakeSuffix} maxFontSizeMultiplier={1.4}>token</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Đặt mức cược tối đa ${formatToken(maxStake)} token`}
            accessibilityState={{ disabled: rolling || maxStake < MIN_STAKE }}
            disabled={rolling || maxStake < MIN_STAKE}
            onPress={() => { Keyboard.dismiss(); setStakeInput(String(maxStake)); }}
            style={[styles.maxButton, (rolling || maxStake < MIN_STAKE) && styles.presetDisabled]}
          >
            <Text style={styles.maxButtonText} maxFontSizeMultiplier={1.4}>Tối đa</Text>
          </TouchableOpacity>
        </View>
        {stakeError ? (
          <Text style={styles.stakeError} accessibilityRole="alert" maxFontSizeMultiplier={1.4}>
            {stakeError}
          </Text>
        ) : (
          <Text style={styles.stakeHelper} maxFontSizeMultiplier={1.4}>
            {`Tối thiểu ${formatToken(MIN_STAKE)} · số dư ${formatToken(balance)} token`}
          </Text>
        )}

        {/* Trả thưởng ngay tại điểm đặt cược, không bắt cuộn xuống đọc luật */}
        {hasStake ? (
          <Text style={styles.betBarOdds} maxFontSizeMultiplier={1.4}>
            {'Đúng cửa '}
            <Text style={styles.num}>{`+${formatToken(stakePayouts.sideWin)}`}</Text>
            {' · bộ ba '}
            <Text style={styles.num}>{`+${formatToken(stakePayouts.tripleWin)}`}</Text>
            {' · sai cửa '}
            <Text style={styles.num}>{`−${formatToken(stakeAmount)}`}</Text>
          </Text>
        ) : null}

        <View style={styles.presets}>
          {STAKE_PRESETS.map(value => {
            const active = stakeAmount === value;
            const overBalance = value > balance;
            const disabled = overBalance || rolling;
            return (
              <TouchableOpacity
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Cược ${formatToken(value)} token`}
                accessibilityHint={overBalance ? 'Vượt số dư hiện tại' : undefined}
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

        <View style={styles.betRow}>
          <BetButton
            label="TÀI"
            range={`tổng ${SIDE_RANGES.TAI}`}
            disabled={!canBet}
            reduceMotion={reduceMotion}
            note={needsConfirm ? 'bước xác nhận' : undefined}
            accessibilityHint={needsConfirm ? 'Mở bảng xác nhận trước khi đặt' : undefined}
            accessibilityLabel={hasStake
              ? `Đặt ${formatToken(stakeAmount)} token cửa Tài, tổng ${SIDE_RANGES.TAI}`
              : stakeError || `Nhập ít nhất ${formatToken(MIN_STAKE)} token để đặt cửa Tài`}
            onPress={() => pressBet(SIDES.TAI)}
          />
          <BetButton
            label="XỈU"
            range={`tổng ${SIDE_RANGES.XIU}`}
            disabled={!canBet}
            reduceMotion={reduceMotion}
            note={needsConfirm ? 'bước xác nhận' : undefined}
            accessibilityHint={needsConfirm ? 'Mở bảng xác nhận trước khi đặt' : undefined}
            accessibilityLabel={hasStake
              ? `Đặt ${formatToken(stakeAmount)} token cửa Xỉu, tổng ${SIDE_RANGES.XIU}`
              : stakeError || `Nhập ít nhất ${formatToken(MIN_STAKE)} token để đặt cửa Xỉu`}
            onPress={() => pressBet(SIDES.XIU)}
          />
        </View>
      </View>

      {/* ── Xác nhận khoản cược lớn hoặc dùng toàn bộ số dư ── */}
      <BottomSheet
        visible={Boolean(confirmSide)}
        onClose={() => setConfirmSide(null)}
        title={confirmSide ? `Đặt ${formatToken(stakeAmount)} vào ${SIDE_LABELS[confirmSide]}?` : 'Xác nhận'}
        subtitle={confirmSide ? `Cửa thắng khi tổng ${SIDE_RANGES[confirmSide]}` : undefined}
        scroll={false}
        footer={
          <>
            <Button
              variant="primary"
              fullWidth
              label={`Đặt ${formatToken(stakeAmount)} token`}
              onPress={confirmBet}
              accessibilityLabel={`Xác nhận đặt ${formatToken(stakeAmount)} token vào cửa ${confirmSide ? SIDE_LABELS[confirmSide] : ''}`}
            />
            <Button
              variant="secondary"
              fullWidth
              label="Huỷ"
              haptic={false}
              onPress={() => setConfirmSide(null)}
            />
          </>
        }
      >
        <View style={styles.confirmBody}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmKey} maxFontSizeMultiplier={1.5}>Đúng cửa</Text>
            <Text style={[styles.confirmValue, { color: colors.success }]} maxFontSizeMultiplier={1.5}>
              {`+${formatToken(stakePayouts.sideWin)}`}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmKey} maxFontSizeMultiplier={1.5}>Bộ ba (2,78%, lãi x2)</Text>
            <Text style={[styles.confirmValue, { color: colors.success }]} maxFontSizeMultiplier={1.5}>
              {`+${formatToken(stakePayouts.tripleWin)}`}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmKey} maxFontSizeMultiplier={1.5}>Sai cửa</Text>
            <Text style={[styles.confirmValue, { color: colors.danger }]} maxFontSizeMultiplier={1.5}>
              {`−${formatToken(stakeAmount)}`}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmKey} maxFontSizeMultiplier={1.5}>Số dư sau khi đúng cửa</Text>
            <Text style={styles.confirmValue} maxFontSizeMultiplier={1.5}>
              {formatToken(balance + stakePayouts.sideWin)}
            </Text>
          </View>
          <Text style={styles.confirmNote} maxFontSizeMultiplier={1.5}>
            Kết quả được quay ngay sau khi bạn xác nhận. Mức thưởng làm tròn xuống token nguyên.
          </Text>
        </View>
      </BottomSheet>

      <AppDrawer {...drawerProps} />
    </View>
  );
}

// Nút cược lớn: nhún 0.97 khi nhấn (tôn trọng giảm chuyển động). Màu trung
// tính — chỉ kết quả mới dùng xanh/đỏ, đúng "The Status-Only Rule".
function BetButton({
  label, range, disabled, reduceMotion, note, accessibilityLabel, accessibilityHint,
  onPress,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to) => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };

  return (
    <Animated.View style={[styles.betWrap, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={[styles.betBtn, disabled && styles.betDisabled]}
      >
        <Text style={styles.betLabel} maxFontSizeMultiplier={1.6}>{label}</Text>
        <Text style={styles.betRange} maxFontSizeMultiplier={1.5}>{range}</Text>
        {note ? <Text style={styles.betNote} maxFontSizeMultiplier={1.4}>{note}</Text> : null}
      </Pressable>
    </Animated.View>
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
  // Số trong câu: mono để tổng/số token thẳng cột (The Money Is Monospace Rule)
  num: { fontFamily: 'monospace' },

  // ── Thống kê: 1 dòng ngay dưới banner, không tách card ──
  statsLine: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  statsText: { ...type.small, color: colors.textDim },

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
  sectionTitle: { ...type.section, color: colors.text },

  // ── Thanh cược cố định ở đáy ──
  betBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  betBarHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  betBarLabel: { ...type.smallStrong, color: colors.textDim },
  betBarValue: { ...type.bodyStrong, color: colors.text, fontFamily: 'monospace' },
  betBarHint: { ...type.small, color: colors.textFaint },
  betBarOdds: { ...type.small, color: colors.textFaint, marginTop: -spacing.xs },
  customStakeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  customStakeBody: { flex: 1, gap: spacing.xs },
  customStakeLabel: { ...type.smallStrong, color: colors.textDim },
  customStakeField: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
  },
  customStakeFieldError: { borderColor: colors.danger },
  customStakeInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: type.subtitle.fontSize,
    paddingVertical: spacing.sm,
    ...type.mono,
  },
  customStakeSuffix: { ...type.small, color: colors.textFaint, marginLeft: spacing.sm },
  maxButton: {
    minHeight: touch.min,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.md,
  },
  maxButtonText: { ...type.smallStrong, color: colors.accentSoft },
  stakeError: { ...type.small, color: colors.danger },
  stakeHelper: { ...type.small, color: colors.textFaint },
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

  // ── Nút cược: nền trung tính, chỉ kết quả mới dùng success/danger ──
  betRow: { flexDirection: 'row', gap: spacing.md },
  betWrap: { flex: 1 },
  betBtn: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  betDisabled: { opacity: 0.55 },
  betLabel: { fontSize: type.h1.fontSize, lineHeight: type.h1.lineHeight, fontWeight: '800', letterSpacing: 0.5, color: colors.text },
  betRange: { ...type.small, color: colors.textDim, fontFamily: 'monospace' },
  betNote: { ...type.small, color: colors.textFaint },

  // ── Bảng xác nhận mức cược lớn ──
  confirmBody: { gap: spacing.sm, paddingBottom: spacing.xs },
  confirmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  confirmKey: { ...type.small, color: colors.textDim, flexShrink: 1 },
  confirmValue: { ...type.bodyStrong, color: colors.text, fontFamily: 'monospace' },
  confirmNote: { ...type.small, color: colors.textFaint, marginTop: spacing.xs },

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
  historyMeta: { ...type.small, color: colors.textDim, fontFamily: 'monospace' },
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

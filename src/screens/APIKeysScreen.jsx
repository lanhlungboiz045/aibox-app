// screens/APIKeysScreen.jsx — Quản lý khóa API
//
// Luồng chính (3 chạm): Home → Khóa API → "+" → "Tạo khóa".
// - Khóa có dạng sk-aibox-...; danh sách mặc định che, bấm con mắt để hiện.
// - Sao chép 1 chạm (nút) + toast + rung.
// - Thu hồi có "Hoàn tác" 5 giây (snackbar), không dùng Alert.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  AppHeader, Button, EmptyState, ErrorState, FadeIn, IconButton, Input, SkeletonList, Switch, BottomSheet, useToast,
} from '../components/ui';
import { formatDate, formatToken } from '../utils/format';
import { copyText } from '../utils/clipboard';
import { hapticError, hapticSuccess } from '../utils/feedback';
import {
  createApiKey, loadApiKeys, peekApiKeys, removeApiKey, restoreApiKey, setApiKeyActive, MAX_API_KEYS,
} from '../services/apiKeys';
import { centeredContent, colors, motion, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

export function APIKeysScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const uid = state.user?.id || null;

  // Có cache RAM → hiện danh sách cũ ngay, không nháy skeleton mỗi lần mở lại
  const cached = peekApiKeys(uid);
  const [keys, setKeys] = useState(() => cached || []);
  const [loading, setLoading] = useState(() => cached === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // id khóa đang hiện đầy đủ (mặc định che hết)
  const [revealed, setRevealed] = useState({});

  // Sheet: 'form' = nhập tên, 'reveal' = hiện khóa vừa tạo
  const [sheetOpen, setSheetOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!uid) { setKeys([]); setLoading(false); return; }
    try {
      const list = await loadApiKeys(uid);
      setKeys(list);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Không đọc được khóa API trên thiết bị.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);

  const onRefresh = () => {
    setRefreshing(true);
    reload();
  };

  const openCreate = () => {
    setCreated(null);
    setName('');
    setLimit('');
    setNameError(null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setCreated(null);
  };

  const handleCreate = async () => {
    if (saving) return;
    const clean = name.trim();
    if (!clean) {
      setNameError('Đặt tên cho khóa để dễ nhớ (ví dụ: "Bot Telegram").');
      hapticError();
      return;
    }
    const limitNumber = Number(String(limit).replace(/[^\d]/g, ''));
    setSaving(true);
    try {
      const { entry, list } = await createApiKey(uid, {
        name: clean,
        monthlyLimit: limitNumber > 0 ? limitNumber : null,
      });
      setKeys(list);
      setCreated(entry);
      setNameError(null);
      hapticSuccess();
    } catch (e) {
      setNameError(e?.message || 'Không tạo được khóa. Thử lại.');
      hapticError();
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (value, label = 'Đã sao chép khóa') => {
    const ok = await copyText(value);
    if (ok) toast.success(label);
    else toast.error('Không sao chép được. Hãy giữ để chọn và sao chép thủ công.');
  };

  const toggleReveal = (id) => {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggle = async (item, next) => {
    // Cập nhật ngay để switch không bị "giật", lỗi thì trả lại
    setKeys(prev => prev.map(k => (k.id === item.id ? { ...k, active: next } : k)));
    try {
      const list = await setApiKeyActive(uid, item.id, next);
      setKeys(list);
    } catch {
      setKeys(prev => prev.map(k => (k.id === item.id ? { ...k, active: item.active } : k)));
      toast.error('Không lưu được trạng thái khóa.');
    }
  };

  const handleRevoke = async (item) => {
    try {
      const { removed, list } = await removeApiKey(uid, item.id);
      setKeys(list);
      if (!removed) return;
      setRevealed(prev => ({ ...prev, [item.id]: false }));
      toast.show(`Đã thu hồi "${removed.name}"`, {
        tone: 'warning',
        duration: motion.undo,
        action: {
          label: 'Hoàn tác',
          onPress: async () => {
            try {
              const restored = await restoreApiKey(uid, removed);
              setKeys(restored);
              toast.success('Đã khôi phục khóa');
            } catch {
              toast.error('Không khôi phục được khóa.');
            }
          },
        },
      });
    } catch {
      toast.error('Không thu hồi được khóa.');
    }
  };

  const activeCount = keys.filter(k => k.active).length;

  return (
    <View style={styles.container}>
      <AppHeader
        navigation={navigation}
        title={t('screen.apiKeys')}
        subtitle={loading ? 'Đang tải…' : `${keys.length}/${MAX_API_KEYS} khóa · ${activeCount} đang bật`}
      />
      <View style={styles.headerActions}>
        <IconButton
          icon="plus"
          label="Tạo khóa API"
          variant="surface"
          color={colors.accentSoft}
          onPress={openCreate}
          disabled={keys.length >= MAX_API_KEYS}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentSoft} />
        }
      >
        {loading ? (
          <SkeletonList count={3} />
        ) : error ? (
          <ErrorState
            title="Không đọc được khóa API"
            message={error}
            onRetry={() => { setLoading(true); reload(); }}
          />
        ) : keys.length === 0 ? (
          <EmptyState
            icon="key"
            title="Chưa có khóa API nào"
            message="Khóa API dùng để gọi AIBox từ ứng dụng hoặc máy chủ của bạn. Mỗi khóa có thể bật/tắt và đặt hạn mức riêng."
            actionLabel="Tạo khóa đầu tiên"
            onAction={openCreate}
          />
        ) : (
          <>
            {keys.map((item, index) => {
              const isRevealed = Boolean(revealed[item.id]);
              return (
                <FadeIn key={item.id} delay={Math.min(index * 30, 150)}>
                  <View style={[styles.card, !item.active && styles.cardOff]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.dot, { backgroundColor: item.active ? colors.success : colors.textFaint }]} />
                      <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.6}>{item.name}</Text>
                      <Switch
                        value={item.active}
                        onValueChange={next => handleToggle(item, next)}
                        accessibilityLabel={`${item.active ? 'Tắt' : 'Bật'} khóa ${item.name}`}
                      />
                    </View>

                    <View style={styles.keyRow}>
                      <Text
                        style={[styles.keyMask, isRevealed && styles.keyFull]}
                        numberOfLines={isRevealed ? undefined : 1}
                        selectable={isRevealed}
                        maxFontSizeMultiplier={1.5}
                      >
                        {isRevealed ? item.key : item.mask}
                      </Text>
                      <IconButton
                        icon={isRevealed ? 'eye-off' : 'eye'}
                        label={isRevealed ? `Ẩn khóa ${item.name}` : `Hiện khóa ${item.name}`}
                        size={18}
                        variant="surface"
                        onPress={() => toggleReveal(item.id)}
                      />
                    </View>

                    <View style={styles.actionsRow}>
                      <Button
                        label="Sao chép"
                        icon="copy"
                        size="sm"
                        variant="secondary"
                        style={styles.flexBtn}
                        onPress={() => handleCopy(item.key, `Đã sao chép khóa ${item.name}`)}
                      />
                      <Button
                        label="Thu hồi"
                        icon="trash-2"
                        size="sm"
                        variant="secondary"
                        style={styles.flexBtn}
                        onPress={() => handleRevoke(item)}
                      />
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                        Tạo {formatDate(item.createdAt)}
                      </Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                        {item.monthlyLimit ? `Hạn mức ${formatToken(item.monthlyLimit)}/tháng` : 'Không giới hạn'}
                      </Text>
                    </View>
                  </View>
                </FadeIn>
              );
            })}

            <View style={styles.note}>
              <Text style={styles.noteText} maxFontSizeMultiplier={1.6}>
                Khóa chỉ lưu trên thiết bị này. Nếu nghi ngờ khóa bị lộ, hãy thu hồi và tạo khóa mới.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={sheetOpen}
        onClose={closeSheet}
        keyboardAware
        title={created ? 'Khóa đã sẵn sàng' : 'Tạo khóa API'}
        subtitle={created ? 'Sao chép và lưu lại ngay — danh sách sẽ che khóa.' : 'Đặt tên để sau này dễ nhận biết.'}
        footer={
          created ? (
            <Button label="Xong" onPress={closeSheet} fullWidth />
          ) : (
            <Button
              label="Tạo khóa"
              icon="plus"
              onPress={handleCreate}
              loading={saving}
              disabled={saving}
              fullWidth
            />
          )
        }
      >
        {created ? (
          <View style={styles.reveal}>
            <View style={styles.revealKeyBox}>
              <Text style={styles.revealKey} selectable maxFontSizeMultiplier={1.5}>{created.key}</Text>
            </View>
            <Button
              label="Sao chép khóa"
              icon="copy"
              variant="secondary"
              fullWidth
              onPress={() => handleCopy(created.key)}
            />
            <Text style={styles.revealHint} maxFontSizeMultiplier={1.6}>
              Hãy lưu khóa ở nơi an toàn. Bạn vẫn có thể hiện lại khóa trong danh sách khi cần.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Tên khóa"
              placeholder="Ví dụ: Bot Telegram"
              value={name}
              onChangeText={value => { setName(value); if (nameError) setNameError(null); }}
              maxLength={40}
              error={nameError}
              helper="Gợi ý theo nơi dùng để dễ thu hồi khi cần."
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <Input
              label="Hạn mức tháng (token, không bắt buộc)"
              placeholder="Ví dụ: 5000"
              value={limit}
              onChangeText={setLimit}
              keyboardType="number-pad"
              helper="Để trống nếu không muốn đặt hạn mức tham khảo."
              maxLength={9}
            />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerActions: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  content: { ...centeredContent, padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  // Khóa đang tắt: giảm độ nổi nhưng chữ vẫn đạt AA (chỉ giảm độ mờ viền/nền)
  cardOff: { backgroundColor: colors.surfaceAlt, opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { ...type.bodyStrong, color: colors.text, flex: 1 },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 52,
  },
  keyMask: { ...type.body, color: colors.textDim, flex: 1, fontFamily: 'monospace' },
  keyFull: { color: colors.accentSoft },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  flexBtn: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { ...type.small, color: colors.textFaint },
  metaDot: { ...type.small, color: colors.textFaint },
  note: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSoft,
  },
  noteText: { ...type.small, color: colors.textFaint, lineHeight: 18 },
  form: { gap: spacing.lg },
  reveal: { gap: spacing.lg },
  revealKeyBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 64,
    justifyContent: 'center',
  },
  revealKey: { ...type.body, color: colors.accentSoft, fontFamily: 'monospace', lineHeight: 22 },
  revealHint: { ...type.small, color: colors.textFaint, lineHeight: 18 },
});

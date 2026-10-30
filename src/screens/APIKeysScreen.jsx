// screens/APIKeysScreen.jsx — Quản lý API key (Bước 3)
//
// Luồng chính (3 chạm): Home → API Keys → "+" → "Tạo key".
// - Key hiện đầy đủ đúng 1 lần lúc tạo; trong danh sách luôn che.
// - Copy 1 chạm (icon) + toast + rung.
// - Xoá có "Hoàn tác" 5 giây (snackbar), không dùng Alert.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  Button, EmptyState, ErrorState, FadeIn, IconButton, Input, SkeletonList, Switch, BottomSheet, useToast,
} from '../components/ui';
import { formatDate, formatToken } from '../utils/format';
import { copyText } from '../utils/clipboard';
import { hapticError, hapticSuccess } from '../utils/feedback';
import {
  createApiKey, loadApiKeys, peekApiKeys, removeApiKey, restoreApiKey, setApiKeyActive, MAX_API_KEYS,
} from '../services/apiKeys';
import { colors, layout, motion, radius, spacing, type } from '../theme/tokens';

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

  // Sheet: 'form' = nhập tên, 'reveal' = hiện key vừa tạo
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
      setError(e?.message || 'Không đọc được API key trên thiết bị.');
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
      setNameError('Đặt tên cho key để dễ nhớ (ví dụ: "Bot Telegram").');
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
      setNameError(e?.message || 'Không tạo được key. Thử lại.');
      hapticError();
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (value, label = 'Đã sao chép key') => {
    const ok = await copyText(value);
    if (ok) toast.success(label);
    else toast.error('Không sao chép được. Hãy giữ để chọn và copy thủ công.');
  };

  const handleToggle = async (item, next) => {
    // Cập nhật ngay để switch không bị "giật", lỗi thì trả lại
    setKeys(prev => prev.map(k => (k.id === item.id ? { ...k, active: next } : k)));
    try {
      const list = await setApiKeyActive(uid, item.id, next);
      setKeys(list);
    } catch {
      setKeys(prev => prev.map(k => (k.id === item.id ? { ...k, active: item.active } : k)));
      toast.error('Không lưu được trạng thái key.');
    }
  };

  const handleDelete = async (item) => {
    try {
      const { removed, list } = await removeApiKey(uid, item.id);
      setKeys(list);
      if (!removed) return;
      toast.show(`Đã xoá "${removed.name}"`, {
        tone: 'warning',
        duration: motion.undo,
        action: {
          label: 'Hoàn tác',
          onPress: async () => {
            try {
              const restored = await restoreApiKey(uid, removed);
              setKeys(restored);
              toast.success('Đã khôi phục key');
            } catch {
              toast.error('Không khôi phục được key.');
            }
          },
        },
      });
    } catch {
      toast.error('Không xoá được key.');
    }
  };

  const activeCount = keys.filter(k => k.active).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={() => navigation.goBack()} />
        <View style={styles.headerBody}>
          <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>API Keys</Text>
          <Text style={styles.headerMeta} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {loading ? 'Đang tải…' : `${keys.length}/${MAX_API_KEYS} key · ${activeCount} đang bật`}
          </Text>
        </View>
        <IconButton
          icon="plus"
          label="Tạo API key"
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
            title="Không đọc được API key"
            message={error}
            onRetry={() => { setLoading(true); reload(); }}
          />
        ) : keys.length === 0 ? (
          <EmptyState
            icon="key"
            title="Chưa có API key nào"
            message="Key dùng để gọi AIBox từ code của bạn. Mỗi key có thể bật/tắt và đặt hạn mức riêng."
            actionLabel="Tạo key đầu tiên"
            onAction={openCreate}
          />
        ) : (
          keys.map((item, index) => (
            <FadeIn key={item.id} delay={Math.min(index * 30, 150)}>
              <View style={[styles.card, !item.active && styles.cardOff]}>
                <View style={styles.cardTop}>
                  <View style={[styles.dot, { backgroundColor: item.active ? colors.success : colors.textFaint }]} />
                  <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.3}>{item.name}</Text>
                  <Switch
                    value={item.active}
                    onValueChange={next => handleToggle(item, next)}
                    accessibilityLabel={`${item.active ? 'Tắt' : 'Bật'} key ${item.name}`}
                  />
                </View>

                <View style={styles.keyRow}>
                  <Text style={styles.keyMask} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.mask}</Text>
                  <IconButton
                    icon="copy"
                    label={`Sao chép key ${item.name}`}
                    size={18}
                    variant="surface"
                    onPress={() => handleCopy(item.key)}
                  />
                  <IconButton
                    icon="trash-2"
                    label={`Xoá key ${item.name}`}
                    size={18}
                    color={colors.danger}
                    onPress={() => handleDelete(item)}
                  />
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    Tạo {formatDate(item.createdAt)}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {item.monthlyLimit ? `Hạn mức ${formatToken(item.monthlyLimit)}/tháng` : 'Không giới hạn'}
                  </Text>
                </View>
              </View>
            </FadeIn>
          ))
        )}

        {!loading && !error && keys.length > 0 ? (
          <View style={styles.note}>
            <Text style={styles.noteText} maxFontSizeMultiplier={1.3}>
              Key chỉ lưu trên thiết bị này (bản demo). Muốn thu hồi, xoá key và tạo key mới.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={sheetOpen}
        onClose={closeSheet}
        keyboardAware
        title={created ? 'Key đã sẵn sàng' : 'Tạo API key'}
        subtitle={created ? 'Sao chép và lưu lại ngay — danh sách sẽ che key.' : 'Đặt tên để sau này dễ nhận biết.'}
        footer={
          created ? (
            <Button label="Xong" onPress={closeSheet} fullWidth />
          ) : (
            <Button
              label="Tạo key"
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
              <Text style={styles.revealKey} selectable maxFontSizeMultiplier={1.2}>{created.key}</Text>
            </View>
            <Button
              label="Sao chép key"
              icon="copy"
              variant="secondary"
              fullWidth
              onPress={() => handleCopy(created.key)}
            />
            <Text style={styles.revealHint} maxFontSizeMultiplier={1.3}>
              Key này chỉ hiện đầy đủ một lần. Bạn vẫn có thể sao chép lại từ danh sách nếu cần.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Tên key"
              placeholder="Ví dụ: Bot Telegram"
              value={name}
              onChangeText={t => { setName(t); if (nameError) setNameError(null); }}
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
              helper="Để trống = không giới hạn. Hạn mức chỉ để tham khảo trong bản demo."
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
  header: {
    height: layout.headerHeight + 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBody: { flex: 1, gap: 2 },
  title: { ...type.subtitle, color: colors.text, fontWeight: '700' },
  headerMeta: { ...type.small, color: colors.textFaint },
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  // Key đang tắt: giảm độ nổi nhưng chữ vẫn đạt AA (chỉ giảm độ mờ viền/nền)
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

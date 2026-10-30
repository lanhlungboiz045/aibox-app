// screens/AIHubScreen.jsx — Marketplace AI models + chat (Bước 3 + 4)
//
// 5 luồng chính ≤ 3 chạm:
//   Chat: tab Chat → chọn model → nhập & Gửi (3 chạm, đã tính lần mở app).
//   Dừng trả lời: 1 chạm vào nút ■ (huỷ request, không trừ token).
//   Xoá lịch sử model: 1 chạm 🗑 → xác nhận (2 chạm).
// Ghi chú UX:
// - Chỉ tự cuộn xuống khi người dùng đang ở gần cuối (không cướp vị trí đọc).
// - Gửi lỗi → bỏ tin nhắn vừa gửi, trả lại nội dung vào ô nhập, hiện lỗi + "Thử lại".
// Bước 4: dải cảnh báo offline, chặn gửi khi live + offline, cache RAM lịch sử chat,
// khung xương bong bóng chat thay spinner, FlatList tối ưu, FadeIn cho danh sách model.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { TokenBadge } from '../components/TokenBadge';
import { AIModelCard } from '../components/AIModelCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { ChatBubble } from '../components/ChatBubble';
import {
  AppIcon, Chip, EmptyState, ErrorState, FadeIn, IconButton, MiniBanner, OfflineBar, Skeleton, useToast,
} from '../components/ui';
import { formatToken, generateId } from '../utils/format';
import { MIN_AI_CALL_BALANCE } from '../utils/aiCost';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAppDrawer } from '../hooks/useAppDrawer';
import { AppDrawer } from '../components/AppDrawer';
import { hapticError } from '../utils/feedback';
import {
  loadChatHistory, loadModelHistory, saveModelHistory,
  clearModelHistory, clearAllChatHistory, countByModel,
} from '../services/chatHistory';
import { colors, layout, radius, spacing, touch, type, centeredContent } from '../theme/tokens';
import { t } from '../i18n';

// Khoảng cách (px) tới cuối danh sách để coi là "đang ở cuối"
const NEAR_BOTTOM = 120;

// Gợi ý câu hỏi cho lần chat đầu tiên
const SUGGESTIONS = [
  'Tóm tắt đoạn văn này giúp tôi',
  'Viết email xin nghỉ phép 1 ngày',
  'Giải thích đoạn code này',
];

// Bong bóng "AI đang trả lời..." với dấu chấm nhấp nháy
function TypingRow() {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const timer = setInterval(() => setDots(d => (d.length >= 3 ? '.' : `${d}.`)), 400);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.typingRow} accessibilityLiveRegion="polite" accessibilityLabel="AI đang trả lời">
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color={colors.accentSoft} />
        <Text style={styles.typingText} maxFontSizeMultiplier={1.6}>AI đang trả lời{dots}</Text>
      </View>
    </View>
  );
}

// Khung xương lịch sử chat: đúng hình bong bóng (trái/phải) thay cho spinner
function HistorySkeleton() {
  return (
    <View style={styles.historySkeleton} accessibilityLabel="Đang tải lịch sử chat">
      <View style={styles.historySkeletonLeft}>
        <Skeleton width="72%" height={54} br={radius.lg} />
        <Skeleton width="48%" height={40} br={radius.lg} />
      </View>
      <View style={styles.historySkeletonRight}>
        <Skeleton width="60%" height={44} br={radius.lg} />
        <Skeleton width="80%" height={62} br={radius.lg} />
      </View>
    </View>
  );
}

export function AIHubScreen() {
  const { state, sendAIMessage, aiConfig } = useApp();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const toast = useToast();
  const { open: openDrawer, drawerProps } = useAppDrawer();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedModel, setSelectedModel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [lastMeta, setLastMeta] = useState(null);
  const [sendError, setSendError] = useState(null); // { message, prompt }
  const [historyCounts, setHistoryCounts] = useState({});
  // modelId mà `messages` hiện tại đã được nạp xong từ storage
  const [loadedModelId, setLoadedModelId] = useState(null);
  // Lỗi đọc lịch sử đã lưu (storage) — hiện ErrorState thay vì treo khung xương
  const [historyError, setHistoryError] = useState(null);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  const listRef = useRef(null);
  // Chỉ tự cuộn khi người dùng đang ở gần cuối danh sách
  const nearBottomRef = useRef(true);
  // Model đang mở tại thời điểm render — tránh response về muộn ghi nhầm cuộc chat
  const openModelRef = useRef(null);
  // Tăng mỗi lần xoá lịch sử / đổi model → bỏ response đang chờ
  const chatEpochRef = useRef(0);
  // Huỷ request khi bấm Dừng / rời màn hình
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  // Cache RAM lịch sử chat theo "uid:modelId" → mở lại model không nháy skeleton
  const historyCacheRef = useRef(new Map());
  // Người dùng đã thay đổi tin nhắn khi storage còn đang đọc → không ghi đè
  const chatDirtyRef = useRef(false);

  const uid = state.user?.id || null;
  const { isOffline, refresh: refreshNetwork } = useNetworkStatus();
  const live = aiConfig?.mode === 'live';

  useEffect(() => () => {
    mountedRef.current = false;
    abortRef.current?.abort();
  }, []);

  const openModel = (model) => {
    // Có cache RAM của model này → hiện ngay tin nhắn cũ, không nháy khung xương
    const cached = uid ? historyCacheRef.current.get(`${uid}:${model.id}`) : null;
    chatDirtyRef.current = false;
    setSelectedModel(model);
    setMessages(cached || []);
    setLoadedModelId(cached ? model.id : null);
    setLastMeta(null);
    setSendError(null);
    setHistoryError(null);
    nearBottomRef.current = true;
  };

  const closeModel = () => {
    // Rời chat → huỷ request đang chờ, không ghi kết quả về muộn
    chatEpochRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setSelectedModel(null);
    setMessages([]);
    setLastMeta(null);
    setSendError(null);
    setHistoryError(null);
    setInput('');
    setSending(false);
  };

  useEffect(() => {
    openModelRef.current = selectedModel?.id || null;
  }, [selectedModel?.id]);

  // Mở từ Model Catalog: tự chọn model theo param
  useEffect(() => {
    const mid = route.params?.modelId;
    if (mid) {
      const m = state.aiModels.find(x => x.id === mid);
      if (m) openModel(m);
    }
  }, [route.params?.modelId, route.params?.ts]);

  // Nạp lại số tin nhắn đã lưu mỗi khi quay lại màn hình
  const refreshHistoryCounts = useCallback(async () => {
    if (!uid) { setHistoryCounts({}); return; }
    const all = await loadChatHistory(uid);
    setHistoryCounts(countByModel(all));
  }, [uid]);

  useFocusEffect(useCallback(() => {
    refreshHistoryCounts();
  }, [refreshHistoryCounts]));

  // Mở 1 model → nạp lịch sử đã lưu của đúng user + model
  useEffect(() => {
    if (!selectedModel) { setLoadedModelId(null); return undefined; }
    let cancelled = false;
    const cacheKey = uid ? `${uid}:${selectedModel.id}` : null;
    const cached = cacheKey ? historyCacheRef.current.get(cacheKey) : null;
    // Đọc lại từ storage cho model này → cho phép áp dữ liệu (trừ khi user vừa gửi)
    chatDirtyRef.current = false;
    setHistoryError(null);

    // Không có cache → khung xương; có cache thì đã hiện sẵn tin nhắn cũ
    if (!cached) {
      setLoadedModelId(null);
      setMessages([]);
    }
    setLastMeta(null);
    setSendError(null);
    nearBottomRef.current = true;

    if (!uid) {
      setLoadedModelId(selectedModel.id);
      return undefined;
    }

    loadModelHistory(uid, selectedModel.id).then(saved => {
      if (cancelled) return;
      // Người dùng đã gửi/ xoá trong lúc đọc → giữ nguyên trạng thái mới hơn
      if (chatDirtyRef.current) return;
      historyCacheRef.current.set(cacheKey, saved);
      // Chỉ set lại khi khác cache để không render thừa
      if (saved !== cached) setMessages(saved);
      setLoadedModelId(selectedModel.id);
    }).catch(e => {
      if (cancelled) return;
      // Không treo khung xương mãi: báo lỗi + cho chat tiếp (dữ liệu cũ vẫn giữ nếu có cache)
      setHistoryError(e?.message || 'Không đọc được lịch sử chat đã lưu.');
      setLoadedModelId(selectedModel.id);
    });

    return () => { cancelled = true; };
  }, [selectedModel?.id, uid, historyReloadKey]);

  // Mọi thay đổi tin nhắn → ghi lại (bỏ qua lúc đang nạp để không ghi đè)
  useEffect(() => {
    if (!uid || !selectedModel || loadedModelId !== selectedModel.id) return;
    const modelId = selectedModel.id;
    const cacheKey = `${uid}:${modelId}`;
    // Vừa đọc từ cache/storage ra → không cần ghi lại y nguyên
    if (historyCacheRef.current.get(cacheKey) === messages) return;
    historyCacheRef.current.set(cacheKey, messages);
    const count = messages.length;

    saveModelHistory(uid, modelId, messages).then(() => {
      setHistoryCounts(prev => {
        if (count === 0) {
          if (!prev[modelId]) return prev;
          const next = { ...prev };
          delete next[modelId];
          return next;
        }
        if (prev[modelId] === count) return prev;
        return { ...prev, [modelId]: count };
      });
    });
  }, [messages, loadedModelId, selectedModel?.id, uid]);

  const typeFilters = [
    { key: 'all', label: 'Tất cả', icon: '\u{2728}' },
    { key: 'text', label: 'Text', icon: '\u{1F4AC}' },
    { key: 'image', label: 'Ảnh', icon: '\u{1F3A8}' },
    { key: 'code', label: 'Code', icon: '\u{1F4BB}' },
  ];

  const keyword = search.trim().toLowerCase();
  const filteredModels = state.aiModels.filter(m => {
    const matchSearch = !keyword
      || m.name.toLowerCase().includes(keyword)
      || m.providerName.toLowerCase().includes(keyword);
    const matchType = filterType === 'all' || m.type === filterType;
    return matchSearch && matchType && m.isAvailable;
  });

  const isLoadingHistory = !!selectedModel && !!uid && loadedModelId !== selectedModel.id;

  const handleScroll = (e) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottomRef.current = distance < NEAR_BOTTOM;
  };

  const maybeScrollToEnd = () => {
    if (nearBottomRef.current) listRef.current?.scrollToEnd({ animated: true });
  };

  // Gửi 1 prompt. Truyền `override` để nút "Thử lại" gửi lại đúng nội dung lỗi.
  const handleSend = async (override) => {
    const draft = String(override ?? input).trim();
    if (!draft || !selectedModel || sending || isLoadingHistory) return;
    const model = selectedModel;

    // Offline: chế độ live không thể gọi API → giữ nguyên câu hỏi trong ô nhập.
    // Chế độ mô phỏng vẫn cho gửi vì không cần mạng.
    if (isOffline && live) {
      setSendError({
        message: 'Không có kết nối mạng. Kết nối lại rồi bấm Thử lại — câu hỏi của bạn vẫn được giữ.',
        prompt: draft,
      });
      hapticError();
      return;
    }

    // Chưa biết trước chi phí thật (trừ theo usage) → chỉ yêu cầu số dư tối thiểu
    if ((state.user?.tokenBalance || 0) < MIN_AI_CALL_BALANCE) {
      Alert.alert(
        'Không đủ token',
        `Cần tối thiểu ${MIN_AI_CALL_BALANCE} token để gọi AI, bạn chỉ có ${formatToken(state.user?.tokenBalance || 0)}.`,
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Nạp token', onPress: () => navigation.navigate('CreditsTopup') },
        ]
      );
      return;
    }

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: draft,
      modelId: model.id,
      timestamp: new Date().toISOString(),
      tokenCost: 0,
    };

    // Lịch sử trước tin nhắn mới → làm context cho API.
    // Chỉ gửi 20 tin gần nhất để prompt không phình to (trừ token theo usage thật).
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;
    chatDirtyRef.current = true;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setLastMeta(null);
    setSendError(null);
    nearBottomRef.current = true; // vừa gửi → luôn cuộn xuống
    const epochAtSend = chatEpochRef.current;

    let res;
    try {
      res = await sendAIMessage({
        modelId: model.id,
        prompt: draft,
        history,
        signal: controller.signal,
      });
    } catch (e) {
      res = { ok: false, error: e?.message || 'Lỗi không xác định khi gọi AI.' };
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }

    if (!mountedRef.current) return;
    setSending(false);

    // Người dùng đã thoát/đổi model/xoá lịch sử trong lúc chờ → không ghi nhầm
    if (openModelRef.current !== model.id || epochAtSend !== chatEpochRef.current) return;

    // Bấm Dừng: chưa có kết quả nên không trừ token → trả nội dung lại ô nhập
    if (res.canceled) {
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      setInput(draft);
      toast.info('Đã dừng yêu cầu · chưa trừ token');
      return;
    }

    if (!res.ok) {
      // Không ghi lỗi vào lịch sử: bỏ tin nhắn vừa gửi, trả text để sửa/gửi lại
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      setInput(prev => (prev.trim() ? prev : draft));
      setSendError({ message: res.error || 'Không gọi được AI.', prompt: draft });
      return;
    }

    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: res.text,
      modelId: model.id,
      timestamp: new Date().toISOString(),
      // Token thực tế đã bị trừ theo usage của API
      tokenCost: res.cost || 0,
    }]);
    setLastMeta({
      mode: res.mode,
      model: res.model,
      latencyMs: res.latencyMs,
      usage: res.usage,
      cost: res.cost || 0,
    });
  };

  const stopSending = () => {
    abortRef.current?.abort();
  };

  const totalHistory = Object.values(historyCounts).reduce((sum, n) => sum + n, 0);

  // Xoá lịch sử của cuộc chat đang mở
  const clearCurrentHistory = () => {
    if (!selectedModel) return;
    if (!messages.length) {
      toast.info(`Chưa có tin nhắn nào với ${selectedModel.name}`);
      return;
    }
    Alert.alert(
      'Xoá lịch sử chat?',
      `Xoá ${messages.length} tin nhắn với ${selectedModel.name}? Token đã trừ không được hoàn lại.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            const modelId = selectedModel.id;
            chatEpochRef.current += 1;
            abortRef.current?.abort();
            abortRef.current = null;
            setSending(false);
            setMessages([]);
            setLastMeta(null);
            setSendError(null);
            if (uid) await clearModelHistory(uid, modelId);
            historyCacheRef.current.delete(`${uid}:${modelId}`);
            chatDirtyRef.current = true;
            setHistoryCounts(prev => {
              if (!prev[modelId]) return prev;
              const next = { ...prev };
              delete next[modelId];
              return next;
            });
          },
        },
      ]
    );
  };

  // Xoá toàn bộ lịch sử chat của user (ở màn danh sách model)
  const clearAllHistory = () => {
    if (!uid || !totalHistory) return;
    const modelCount = Object.keys(historyCounts).length;
    Alert.alert(
      'Xoá toàn bộ lịch sử chat?',
      `${totalHistory} tin nhắn của ${modelCount} model sẽ bị xoá vĩnh viễn. Token đã trừ không được hoàn lại.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá tất cả',
          style: 'destructive',
          onPress: async () => {
            chatEpochRef.current += 1;
            abortRef.current?.abort();
            abortRef.current = null;
            setSending(false);
            await clearAllChatHistory(uid);
            historyCacheRef.current.clear();
            chatDirtyRef.current = true;
            setHistoryCounts({});
            setMessages([]);
            setLastMeta(null);
            setSendError(null);
            toast.success('Đã xoá toàn bộ lịch sử chat');
          },
        },
      ]
    );
  };

  const openSettings = () => navigation.navigate('AISettings');

  const canSend = !sending && !isLoadingHistory && input.trim().length > 0;

  // ───────────────────────── Chat view ─────────────────────────
  if (selectedModel) {
    const metaText = lastMeta
      ? [
        lastMeta.mode === 'live' ? `LIVE · ${lastMeta.model}` : 'Trả lời mô phỏng',
        lastMeta.latencyMs ? `${lastMeta.latencyMs}ms` : null,
        lastMeta.cost ? `-${formatToken(lastMeta.cost)} token` : null,
      ].filter(Boolean).join(' · ')
      : null;

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.chatHeader, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.chatHeaderRow}>
            <IconButton icon="chevron-left" label="Đóng cuộc chat" onPress={closeModel} />
            <View style={[styles.chatAvatar, { backgroundColor: (selectedModel.accentColor || colors.accent) + '22' }]}>
              <Text style={styles.chatAvatarText}>{selectedModel.icon}</Text>
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName} numberOfLines={1} maxFontSizeMultiplier={1.6}>
                {selectedModel.name}
              </Text>
              <View style={styles.chatHeaderMetaRow}>
                <View style={[styles.modeDot, { backgroundColor: live ? colors.success : colors.warning }]} />
                <Text style={styles.chatHeaderSub} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                  {sending ? 'Đang trả lời…' : live ? `LIVE · ${aiConfig.model}` : 'MOCK · chưa có API key'}
                </Text>
              </View>
            </View>
            <IconButton
              icon="trash-2"
              label="Xoá lịch sử chat"
              size={18}
              disabled={sending || messages.length === 0}
              onPress={clearCurrentHistory}
            />
            <IconButton icon="settings" label="Cài đặt AI" size={18} onPress={openSettings} />
          </View>
        </View>

        {historyError ? (
          <View style={styles.bannerWrap}>
            <MiniBanner
              icon="alert-triangle"
              tone="warning"
              text="Không đọc được lịch sử đã lưu — chạm để thử lại"
              onPress={() => { setHistoryError(null); setHistoryReloadKey(k => k + 1); }}
            />
          </View>
        ) : null}

        {isOffline ? (
          <OfflineBar
            text={live
              ? 'Mất mạng — không gửi được tin nhắn mới. Tin nhắn đã lưu vẫn xem được.'
              : 'Mất mạng — vẫn chat được ở chế độ mô phỏng.'}
            onRetry={refreshNetwork}
            style={styles.offlineBar}
          />
        ) : null}

        <FlatList
          ref={listRef}
          data={sending ? [...messages, { id: '__typing', role: 'assistant', content: '' }] : messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (item.id === '__typing' ? <TypingRow /> : <ChatBubble message={item} />)}
          contentContainerStyle={[styles.messagesList, messages.length === 0 && styles.messagesListEmpty]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={maybeScrollToEnd}
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={9}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            isLoadingHistory ? (
              <HistorySkeleton />
            ) : historyError ? (
              <View style={styles.historyErrorWrap}>
                <ErrorState
                  compact
                  title="Không đọc được lịch sử chat"
                  message={historyError}
                  onRetry={() => { setHistoryError(null); setHistoryReloadKey(k => k + 1); }}
                />
              </View>
            ) : (
              <View style={styles.chatEmpty}>
                <EmptyState
                  icon="message-circle"
                  title="Bắt đầu trò chuyện"
                  message={`Hỏi ${selectedModel.name} bất cứ điều gì. Lịch sử được lưu tự động theo tài khoản.`}
                />
                <Text style={styles.suggestLabel} maxFontSizeMultiplier={1.6}>{t('aihub.suggest')}</Text>
                <View style={styles.suggestWrap}>
                  {SUGGESTIONS.map(s => (
                    <Chip key={s} label={s} onPress={() => setInput(s)} />
                  ))}
                </View>
              </View>
            )
          }
          ListFooterComponent={
            sendError ? (
              <View style={styles.errorWrap}>
                <ErrorState
                  compact
                  title="Không gửi được tin nhắn"
                  message={sendError.message}
                  onRetry={() => handleSend(sendError.prompt)}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setSendError(null)}
                  style={styles.errorDismiss}
                  hitSlop={touch.hitSlop}
                  accessibilityLabel="Bỏ thông báo lỗi"
                >
                  <Text style={styles.errorDismissText} maxFontSizeMultiplier={1.6}>Bỏ qua</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        {/* Thông tin lần gọi gần nhất (model thật, độ trễ, token usage) */}
        {metaText && !sending ? (
          <View style={styles.metaBar}>
            <Text style={styles.metaText} numberOfLines={1} maxFontSizeMultiplier={1.5}>
              {metaText}
            </Text>
          </View>
        ) : null}

        {selectedModel.type === 'image' ? (
          <View style={styles.imageNote}>
            <AppIcon name="image" size={14} color={colors.textFaint} />
            <Text style={styles.imageNoteText} maxFontSizeMultiplier={1.6}>
              Model ảnh chưa hỗ trợ trong khung chat văn bản.
            </Text>
          </View>
        ) : null}

        {/* Bỏ bottom tab → input bar tự chừa insets.bottom để không bị home indicator che */}
        <View style={[styles.inputBar, { paddingBottom: spacing.sm + insets.bottom }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(value) => { setInput(value); if (sendError) setSendError(null); }}
            placeholder={isLoadingHistory ? 'Đang tải lịch sử…' : 'Nhập câu hỏi…'}
            placeholderTextColor={colors.textFaint}
            multiline
            editable={!isLoadingHistory}
            accessibilityLabel="Nội dung tin nhắn"
            accessibilityHint="Nhập câu hỏi rồi bấm Gửi"
            maxFontSizeMultiplier={1.8}
          />

          {sending ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.stopBtn]}
              onPress={stopSending}
              accessibilityRole="button"
              accessibilityLabel="Dừng trả lời"
              accessibilityHint="Huỷ yêu cầu đang chờ, không trừ token"
            >
              <AppIcon name="square" size={16} color={colors.danger} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionBtn, !canSend && styles.actionBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!canSend}
              accessibilityLabel="Gửi tin nhắn"
              accessibilityState={{ disabled: !canSend }}
            >
              <AppIcon name="arrow-up" size={20} color={canSend ? colors.onAccent : colors.disabledText} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ───────────────────── Danh sách model ─────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <IconButton icon="menu" label={t('nav.openMenu')} size={20} onPress={openDrawer} />
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.5}>{t('screen.aihub')}</Text>
            <Text style={styles.headerMeta} numberOfLines={1} maxFontSizeMultiplier={1.5}>
              {totalHistory > 0 ? `${totalHistory} tin nhắn đã lưu` : 'Chọn model để bắt đầu'}
            </Text>
          </View>
          <TokenBadge size="medium" />
          {totalHistory > 0 ? (
            <IconButton icon="trash-2" label="Xoá toàn bộ lịch sử chat" size={18} onPress={clearAllHistory} />
          ) : null}
          <IconButton icon="settings" label="Cài đặt AI" size={18} onPress={openSettings} />
        </View>
      </View>

      {isOffline ? (
        <OfflineBar onRetry={refreshNetwork} style={styles.offlineBar} />
      ) : null}

      <ScrollView
        contentContainerStyle={[centeredContent, { paddingBottom: spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chưa cấu hình key → nhắc ngay trên đầu danh sách */}
        {aiConfig?.mode !== 'live' ? (
          <View style={styles.bannerWrap}>
            <MiniBanner
              icon="alert-triangle"
              tone="warning"
              text="Chưa cấu hình AI thật — đang trả lời mô phỏng"
              onPress={openSettings}
            />
          </View>
        ) : null}

        <View style={styles.searchWrap}>
          <AppIcon name="search" size={16} color={colors.textFaint} />
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm model hoặc provider…"
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            accessibilityLabel="Tìm model"
            maxFontSizeMultiplier={1.8}
          />
          {search ? (
            <IconButton icon="x" label="Xoá từ khoá tìm kiếm" size={16} onPress={() => setSearch('')} />
          ) : null}
        </View>

        <CategoryFilter categories={typeFilters} selected={filterType} onSelect={setFilterType} />

        <View style={styles.modelList}>
          {filteredModels.map((model, index) => (
            <FadeIn key={model.id} delay={Math.min(index * 25, 120)}>
              <AIModelCard
                model={model}
                historyCount={historyCounts[model.id] || 0}
                onPress={() => openModel(model)}
              />
            </FadeIn>
          ))}
        </View>

        {filteredModels.length === 0 ? (
          <EmptyState
            icon="search"
            title="Không tìm thấy model nào"
            message={keyword ? `Không có model khớp "${search.trim()}".` : 'Bộ lọc này chưa có model nào.'}
            actionLabel="Xoá bộ lọc"
            onAction={() => { setSearch(''); setFilterType('all'); }}
          />
        ) : null}
      </ScrollView>

      <AppDrawer {...drawerProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ── Danh sách model ──
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerRow: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  headerTitleWrap: { flex: 1, gap: 2 },
  title: { ...type.h1, color: colors.text },
  headerMeta: { ...type.small, color: colors.textFaint },
  bannerWrap: { paddingHorizontal: layout.gutter, paddingTop: spacing.md },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.gutter,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: touch.min + 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  search: {
    flex: 1,
    color: colors.text,
    fontSize: type.subtitle.fontSize,
    paddingVertical: spacing.sm,
  },
  modelList: { marginTop: spacing.sm },

  // ── Chat: header ──
  chatHeader: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: { fontSize: 18 },
  chatHeaderInfo: { flex: 1, gap: 2, paddingLeft: spacing.xs },
  chatHeaderName: { ...type.subtitle, color: colors.text },
  chatHeaderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  modeDot: { width: 6, height: 6, borderRadius: 3 },
  chatHeaderSub: { ...type.small, color: colors.textFaint, flex: 1 },

  // ── Chat: body ──
  messagesList: { ...centeredContent, paddingVertical: spacing.md, paddingHorizontal: 0 },
  messagesListEmpty: { flexGrow: 1, justifyContent: 'center' },
  historySkeleton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.lg },
  historySkeletonLeft: { gap: spacing.sm },
  historySkeletonRight: { gap: spacing.sm, alignItems: 'flex-end' },
  historyErrorWrap: { paddingHorizontal: layout.gutter },
  offlineBar: { marginHorizontal: layout.gutter, marginTop: spacing.sm },
  chatEmpty: { paddingHorizontal: spacing.lg, gap: spacing.md },
  suggestLabel: {
    ...type.smallStrong,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaBar: {
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
  },
  metaText: { ...type.small, color: colors.textFaint, ...type.mono },
  imageNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.gutter,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSoft,
  },
  imageNoteText: { ...type.small, color: colors.textFaint, flex: 1 },

  // ── Chat: lỗi gửi ──
  errorWrap: {
    marginHorizontal: layout.gutter,
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.lg,
  },
  errorDismiss: {
    alignSelf: 'center',
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorDismissText: { ...type.smallStrong, color: colors.textDim },

  // ── Chat: nhập & gửi ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: touch.min + 4,
    maxHeight: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.text,
    fontSize: type.subtitle.fontSize,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  actionBtn: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: { backgroundColor: colors.disabledBg },
  stopBtn: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },

  // ── Chat: đang trả lời ──
  typingRow: { alignItems: 'flex-start', marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  typingText: { ...type.small, color: colors.textDim },
});

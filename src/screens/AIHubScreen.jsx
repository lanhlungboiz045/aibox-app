// screens/AIHubScreen.jsx — Marketplace AI models + chat interface
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { TokenBadge } from '../components/TokenBadge';
import { AIModelCard } from '../components/AIModelCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { ChatBubble } from '../components/ChatBubble';
import { formatToken, generateId } from '../utils/format';
import { MIN_AI_CALL_BALANCE } from '../utils/aiCost';
import {
  loadChatHistory, loadModelHistory, saveModelHistory,
  clearModelHistory, clearAllChatHistory, countByModel,
} from '../services/chatHistory';

// Bong bóng "AI đang trả lời..." với dấu chấm nhấp nháy
function TypingRow() {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const timer = setInterval(() => setDots(d => (d.length >= 3 ? '.' : `${d}.`)), 400);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>AI đang trả lời{dots}</Text>
      </View>
    </View>
  );
}

export function AIHubScreen() {
  const { state, sendAIMessage, aiConfig } = useApp();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedModel, setSelectedModel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [lastMeta, setLastMeta] = useState(null);
  const [historyCounts, setHistoryCounts] = useState({});
  // modelId mà `messages` hiện tại đã được nạp xong từ storage
  const [loadedModelId, setLoadedModelId] = useState(null);
  const listRef = useRef(null);
  // Model đang mở tại thời điểm render — tránh response về muộn ghi nhầm cuộc chat
  const openModelRef = useRef(null);
  // Tăng mỗi lần xoá lịch sử → bỏ response đang chờ (tránh ghi lại tin nhắn vừa xoá)
  const chatEpochRef = useRef(0);
  const uid = state.user?.id || null;

  const openModel = (model) => {
    setSelectedModel(model);
    setMessages([]);
    setLastMeta(null);
  };

  const closeModel = () => {
    setSelectedModel(null);
    setMessages([]);
    setLastMeta(null);
  };

  React.useEffect(() => {
    openModelRef.current = selectedModel?.id || null;
  }, [selectedModel?.id]);

  // Mở từ Model Catalog: tự chọn model theo param
  React.useEffect(() => {
    const mid = route.params?.modelId;
    if (mid) {
      const m = state.aiModels.find(x => x.id === mid);
      if (m) openModelRef.current = m.id;
      if (m) setSelectedModel(m);
    }
  }, [route.params?.modelId, route.params?.ts]);

  // Nạp lại số tin nhắn đã lưu mỗi khi quay lại màn hình
  const refreshHistoryCounts = React.useCallback(async () => {
    if (!uid) { setHistoryCounts({}); return; }
    const all = await loadChatHistory(uid);
    setHistoryCounts(countByModel(all));
  }, [uid]);

  useFocusEffect(React.useCallback(() => {
    refreshHistoryCounts();
  }, [refreshHistoryCounts]));

  // Mở 1 model → nạp lịch sử đã lưu của đúng user + model
  React.useEffect(() => {
    if (!selectedModel) { setLoadedModelId(null); return undefined; }
    let cancelled = false;
    setLoadedModelId(null);
    setMessages([]);
    setLastMeta(null);

    if (!uid) {
      setLoadedModelId(selectedModel.id);
      return undefined;
    }

    loadModelHistory(uid, selectedModel.id).then(saved => {
      if (cancelled) return;
      setMessages(saved);
      setLoadedModelId(selectedModel.id);
    });

    return () => { cancelled = true; };
  }, [selectedModel?.id, uid]);

  // Mọi thay đổi tin nhắn → ghi lại (bỏ qua lúc đang nạp để không ghi đè)
  React.useEffect(() => {
    if (!uid || !selectedModel || loadedModelId !== selectedModel.id) return;
    const modelId = selectedModel.id;
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
    { key: 'all', label: 'All', icon: '\u{2728}' },
    { key: 'text', label: 'Text', icon: '\u{1F4AC}' },
    { key: 'image', label: 'Image', icon: '\u{1F3A8}' },
    { key: 'code', label: 'Code', icon: '\u{1F4BB}' },
  ];

  const filteredModels = state.aiModels.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.providerName.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || m.type === filterType;
    return matchSearch && matchType && m.isAvailable;
  });

  const isLoadingHistory = !!selectedModel && !!uid && loadedModelId !== selectedModel.id;

  const handleSend = async () => {
    // Chờ nạp xong lịch sử để không ghi đè/ghi nhầm cuộc chat
    if (!input.trim() || !selectedModel || sending || isLoadingHistory) return;
    const prompt = input.trim();
    const model = selectedModel;

    // Chưa biết trước chi phí thật (trừ theo usage) → chỉ yêu cầu số dư tối thiểu
    if (state.user.tokenBalance < MIN_AI_CALL_BALANCE) {
      Alert.alert(
        'Không đủ token',
        `Cần tối thiểu ${MIN_AI_CALL_BALANCE} token để gọi AI, bạn chỉ có ${formatToken(state.user.tokenBalance)}.`
      );
      return;
    }

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: prompt,
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

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setLastMeta(null);
    const epochAtSend = chatEpochRef.current;

    const res = await sendAIMessage({ modelId: model.id, prompt, history });

    setSending(false);

    // Người dùng đã thoát/đổi model/xoá lịch sử trong lúc chờ → không ghi nhầm
    if (openModelRef.current !== model.id || epochAtSend !== chatEpochRef.current) return;

    if (!res.ok) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `\u{26A0}\u{FE0F} Không gọi được AI:\n${res.error}`,
        modelId: model.id,
        timestamp: new Date().toISOString(),
        tokenCost: 0,
      }]);
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

  const totalHistory = Object.values(historyCounts).reduce((sum, n) => sum + n, 0);

  // Xoá lịch sử của cuộc chat đang mở
  const clearCurrentHistory = () => {
    if (!selectedModel) return;
    if (!messages.length) {
      Alert.alert('Chưa có lịch sử', `Chưa có tin nhắn nào với ${selectedModel.name}.`);
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
            setMessages([]);
            setLastMeta(null);
            if (uid) await clearModelHistory(uid, modelId);
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
            await clearAllChatHistory(uid);
            setHistoryCounts({});
            setMessages([]);
            setLastMeta(null);
          },
        },
      ]
    );
  };

  const openSettings = () => navigation.navigate('AISettings');

  if (selectedModel) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.chatHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={closeModel}>
            <Text style={styles.backBtn}>{'\u{276C}'} Back</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderIcon}>{selectedModel.icon}</Text>
            <View>
              <Text style={styles.chatHeaderName}>{selectedModel.name}</Text>
              <Text style={styles.chatHeaderSub}>
                trừ theo token thực tế ·{' '}
                {aiConfig?.mode === 'live' ? `LIVE · ${aiConfig.model}` : 'MOCK (chưa có key)'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.gearBtn}
              onPress={clearCurrentHistory}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Xoá lịch sử chat"
            >
              <Text style={styles.gearText}>{'\u{1F5D1}\u{FE0F}'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gearBtn} onPress={openSettings} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.gearText}>{'\u{2699}\u{FE0F}'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={sending ? [...messages, { id: '__typing', role: 'assistant', content: '' }] : messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (item.id === '__typing' ? <TypingRow /> : <ChatBubble message={item} />)}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={(
            <View style={styles.chatEmpty}>
              <Text style={styles.chatEmptyIcon}>{'\u{1F4AC}'}</Text>
              <Text style={styles.chatEmptyTitle}>
                {isLoadingHistory ? 'Đang tải lịch sử chat...' : 'Bắt đầu cuộc trò chuyện'}
              </Text>
              {!isLoadingHistory && (
                <Text style={styles.chatEmptyHint}>
                  Lịch sử được lưu tự động theo tài khoản và model. Bấm {'\u{1F5D1}\u{FE0F}'} trên đầu để xoá.
                </Text>
              )}
            </View>
          )}
        />

        {/* Thông tin lần gọi gần nhất (model thật, độ trễ, token usage) */}
        {lastMeta && !sending && (
          <View style={styles.metaBar}>
            <Text style={styles.metaText} numberOfLines={1}>
              {lastMeta.mode === 'live' ? `\u{2705} ${lastMeta.model}` : '\u{1F9EA} Trả lời mô phỏng'}
              {lastMeta.latencyMs ? ` · ${lastMeta.latencyMs}ms` : ''}
              {lastMeta.cost ? ` · -${formatToken(lastMeta.cost)} token` : ''}
              {lastMeta.usage && lastMeta.usage.total_tokens
                ? ` · usage ${lastMeta.usage.total_tokens}${lastMeta.usage.estimated ? ' (ước lượng)' : ''}`
                : ''}
            </Text>
          </View>
        )}

        {selectedModel.type === 'image' && messages.length > 0 && (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>{'\u{1F3A8}'}</Text>
            <Text style={styles.imagePlaceholderText}>Model ảnh chưa hỗ trợ ở chế độ chat text</Text>
          </View>
        )}

        {/* Tab bar vẫn hiển thị dưới chat nên input bar không cộng thêm insets.bottom */}
        <View style={[styles.inputBar, { paddingBottom: 10 }]}>
          <TextInput style={styles.input} value={input} onChangeText={setInput}
            placeholder={isLoadingHistory ? 'Đang tải lịch sử chat...' : 'Nhập câu hỏi...'}
            placeholderTextColor="#5C5C5C" multiline editable={!sending && !isLoadingHistory} />
          <TouchableOpacity style={[styles.sendBtn, (sending || isLoadingHistory || !input.trim()) && styles.sendBtnDisabled]} onPress={handleSend} disabled={sending || isLoadingHistory || !input.trim()}>
            <Text style={styles.sendBtnText}>{'\u{2793}'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      // Tab bar bên dưới đã tự chừa insets.bottom → chỉ cần chừa status bar ở trên
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 20 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI Hub</Text>
        <View style={styles.headerRight}>
          <TokenBadge size="medium" />
          <TouchableOpacity style={styles.gearBtn} onPress={openSettings}>
            <Text style={styles.gearText}>{'\u{2699}\u{FE0F}'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lịch sử chat đã lưu → cho xoá nhanh toàn bộ */}
      {totalHistory > 0 && (
        <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllHistory} activeOpacity={0.8}>
          <Text style={styles.clearAllText}>
            {'\u{1F5D1}\u{FE0F}'} Xoá lịch sử chat ({totalHistory} tin nhắn)
          </Text>
        </TouchableOpacity>
      )}

      {/* Chưa cấu hình key → nhắc ngay trên đầu danh sách */}
      {aiConfig?.mode !== 'live' && (
        <TouchableOpacity style={styles.mockBanner} onPress={openSettings} activeOpacity={0.85}>
          <Text style={styles.mockBannerText}>
            {'\u{26A0}\u{FE0F}'} Chưa cấu hình AI thật — app đang trả lời mô phỏng. Bấm để nhập API key.
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.searchWrap}>
        <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Tìm model hoặc provider..." placeholderTextColor="#5C5C5C" />
      </View>
      <CategoryFilter categories={typeFilters} selected={filterType} onSelect={setFilterType} />
      <View style={{ marginTop: 8 }}>
        {filteredModels.map(model => (
          <AIModelCard
            key={model.id}
            model={model}
            historyCount={historyCounts[model.id] || 0}
            onPress={() => openModel(model)}
          />
        ))}
      </View>
      {filteredModels.length === 0 && <Text style={styles.empty}>Không tìm thấy model nào</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  search: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },
  empty: { color: '#5C5C5C', fontSize: 13, textAlign: 'center', padding: 20 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1A1D24', borderBottomWidth: 1, borderBottomColor: '#2A2E36' },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600' },
  chatHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatHeaderIcon: { fontSize: 18 },
  chatHeaderName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  chatHeaderSub: { color: '#8E8E93', fontSize: 10, marginTop: 1 },
  gearBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  gearText: { fontSize: 17 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearAllBtn: { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(255, 107, 107, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  clearAllText: { color: '#FF6B6B', fontSize: 11, fontWeight: '600' },
  chatEmpty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  chatEmptyIcon: { fontSize: 34, marginBottom: 10 },
  chatEmptyTitle: { color: '#E0E0E0', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  chatEmptyHint: { color: '#5C5C5C', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  mockBanner: { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(255, 183, 77, 0.10)', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.3)', borderRadius: 10, padding: 10 },
  mockBannerText: { color: '#FFB74D', fontSize: 11, lineHeight: 16 },
  typingRow: { alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 16 },
  typingBubble: { backgroundColor: '#22262E', borderWidth: 1, borderColor: '#2A2E36', borderRadius: 12, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 10 },
  typingText: { color: '#8E8E93', fontSize: 13, fontStyle: 'italic' },
  metaBar: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#0F1115' },
  metaText: { color: '#5C5C5C', fontSize: 10, fontFamily: 'monospace' },
  costPill: { backgroundColor: 'rgba(108, 92, 231, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  costPillText: { color: '#A78BFA', fontSize: 12, fontWeight: '600', fontFamily: 'monospace' },
  messagesList: { paddingVertical: 12 },
  imagePlaceholder: { alignItems: 'center', padding: 20, backgroundColor: '#1A1D24', marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2A2E36', borderStyle: 'dashed' },
  imagePlaceholderIcon: { fontSize: 36, marginBottom: 8 },
  imagePlaceholderText: { color: '#8E8E93', fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1A1D24', borderTopWidth: 1, borderTopColor: '#2A2E36', gap: 8 },
  input: { flex: 1, backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: '#6C5CE7', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});

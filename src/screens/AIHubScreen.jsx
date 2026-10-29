// screens/AIHubScreen.jsx — Marketplace AI models + chat interface
import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useRoute } from '@react-navigation/native';
import { TokenBadge } from '../components/TokenBadge';
import { AIModelCard } from '../components/AIModelCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { ChatBubble } from '../components/ChatBubble';
import { formatToken, generateId } from '../utils/format';

export function AIHubScreen() {
  const { state, callAI } = useApp();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedModel, setSelectedModel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  // Mở từ Model Catalog: tự chọn model theo param
  React.useEffect(() => {
    const mid = route.params?.modelId;
    if (mid) {
      const m = state.aiModels.find(x => x.id === mid);
      if (m) { setSelectedModel(m); setMessages([]); }
    }
  }, [route.params?.modelId]);

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

  const handleSend = () => {
    if (!input.trim() || !selectedModel) return;
    const prompt = input.trim();
    if (state.user.tokenBalance < selectedModel.tokenCost) {
      Alert.alert('Không đủ token', `Cần ${selectedModel.tokenCost} token, bạn chỉ có ${formatToken(state.user.tokenBalance)}.`);
      return;
    }
    const userMsg = { id: generateId(), role: 'user', content: prompt, modelId: selectedModel.id, timestamp: new Date().toISOString(), tokenCost: 0 };
    const response = callAI(selectedModel.id, prompt);
    const aiMsg = { id: generateId(), role: 'assistant', content: response || 'Lỗi khi gọi AI.', modelId: selectedModel.id, timestamp: new Date().toISOString(), tokenCost: selectedModel.tokenCost };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  if (selectedModel) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.chatHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => { setSelectedModel(null); setMessages([]); }}>
            <Text style={styles.backBtn}>{'\u{276C}'} Back</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderIcon}>{selectedModel.icon}</Text>
            <Text style={styles.chatHeaderName}>{selectedModel.name}</Text>
          </View>
          <View style={styles.costPill}>
            <Text style={styles.costPillText}>{selectedModel.tokenCost} {'\u{1F4B0}'}/call</Text>
          </View>
        </View>

        <FlatList ref={listRef} data={messages} keyExtractor={item => item.id} renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })} />

        {selectedModel.type === 'image' && messages.length > 0 && (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>{'\u{1F3A8}'}</Text>
            <Text style={styles.imagePlaceholderText}>Image sẽ hiển thị ở đây (demo mode)</Text>
          </View>
        )}

        {/* Tab bar vẫn hiển thị dưới chat nên input bar không cộng thêm insets.bottom */}
        <View style={[styles.inputBar, { paddingBottom: 10 }]}>
          <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Nhập câu hỏi..."
            placeholderTextColor="#5C5C5C" multiline />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
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
        <TokenBadge size="medium" />
      </View>
      <View style={styles.searchWrap}>
        <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Tìm model hoặc provider..." placeholderTextColor="#5C5C5C" />
      </View>
      <CategoryFilter categories={typeFilters} selected={filterType} onSelect={setFilterType} />
      <View style={{ marginTop: 8 }}>
        {filteredModels.map(model => (
          <AIModelCard key={model.id} model={model} onPress={() => { setSelectedModel(model); setMessages([]); }} />
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
  costPill: { backgroundColor: 'rgba(108, 92, 231, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  costPillText: { color: '#A78BFA', fontSize: 12, fontWeight: '600', fontFamily: 'monospace' },
  messagesList: { paddingVertical: 12 },
  imagePlaceholder: { alignItems: 'center', padding: 20, backgroundColor: '#1A1D24', marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2A2E36', borderStyle: 'dashed' },
  imagePlaceholderIcon: { fontSize: 36, marginBottom: 8 },
  imagePlaceholderText: { color: '#8E8E93', fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1A1D24', borderTopWidth: 1, borderTopColor: '#2A2E36', gap: 8 },
  input: { flex: 1, backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: '#6C5CE7', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});

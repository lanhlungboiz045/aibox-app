// components/ChatBubble.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRelativeTime } from '../utils/format';

export function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
          {message.content}
        </Text>
      </View>
      <View style={styles.metaRow}>
        {message.tokenCost > 0 && (
          <Text style={styles.cost}>-{'\u{1F4B0}'} {message.tokenCost}</Text>
        )}
        <Text style={styles.time}>{formatRelativeTime(message.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 16 },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 12, padding: 12 },
  bubbleUser: { backgroundColor: '#6C5CE7', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#22262E', borderWidth: 1, borderColor: '#2A2E36', borderBottomLeftRadius: 4 },
  text: { fontSize: 14, lineHeight: 20 },
  textUser: { color: '#FFFFFF' },
  textAI: { color: '#E0E0E0' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingHorizontal: 4 },
  cost: { color: '#FF6B6B', fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },
  time: { color: '#5C5C5C', fontSize: 11 },
});

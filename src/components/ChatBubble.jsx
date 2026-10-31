// components/ChatBubble.jsx — Bong bóng chat (Bước 3)
// Bong bóng người dùng nền tím đậm + chữ trắng (5.7:1), bong bóng AI nền surface.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRelativeTime, formatToken } from '../utils/format';
import { colors, radius, spacing, type } from '../theme/tokens';

export function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View
      style={[styles.row, isUser && styles.rowUser]}
      accessibilityLabel={`${isUser ? 'Bạn' : 'AI'}: ${String(message.content || '').slice(0, 160)}`}
    >
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text
          style={[styles.text, isUser ? styles.textUser : styles.textAI]}
          selectable
          maxFontSizeMultiplier={1.6}
        >
          {message.content}
        </Text>
      </View>
      <View style={styles.metaRow}>
        {message.tokenCost > 0 ? (
          <Text style={styles.cost} maxFontSizeMultiplier={1.5}>
            {`-${formatToken(message.tokenCost)} token`}
          </Text>
        ) : null}
        <Text style={styles.time} maxFontSizeMultiplier={1.5}>
          {formatRelativeTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-start', marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  bubbleUser: { backgroundColor: colors.accentStrong, borderBottomRightRadius: radius.xs },
  bubbleAI: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.xs,
  },
  text: { ...type.body, lineHeight: 21 },
  textUser: { color: colors.onAccent },
  textAI: { color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, paddingHorizontal: spacing.xs },
  cost: { ...type.smallStrong, color: colors.warning, ...type.mono },
  time: { ...type.small, color: colors.textFaint },
});

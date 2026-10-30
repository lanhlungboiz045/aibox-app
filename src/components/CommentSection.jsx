// components/CommentSection.jsx — Thảo luận dưới mỗi market
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { getStoreItem } from '../data/storeItems';
import { ROLE_LABELS, ROLE_COLORS } from '../data/accounts';
import { formatRelativeTime } from '../utils/format';
import { colors, touch } from '../theme/tokens';

export function CommentSection({ marketId }) {
  const { state, addComment, likeComment, deleteComment } = useApp();
  const user = state.user;
  const [draft, setDraft] = useState('');
  const comments = state.comments[marketId] || [];

  if (!user) return null;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addComment(marketId, text);
    setDraft('');
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{'\u{1F4AC}'} Thảo luận</Text>
        <Text style={styles.count}>{comments.length} bình luận</Text>
      </View>

      <View style={styles.inputRow}>
        <Text style={styles.myAvatar}>{user.avatar}</Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Chia sẻ luận điểm, tin tức, hoặc shill kèo..."
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
          onPress={submit}
          disabled={!draft.trim()}
        >
          <Text style={styles.sendText}>{'\u{27A4}'}</Text>
        </TouchableOpacity>
      </View>

      {comments.length === 0 ? (
        <Text style={styles.empty}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
      ) : (
        comments.map(comment => {
          const frame = comment.frame ? getStoreItem(comment.frame) : null;
          const nameColor = comment.nameColor ? getStoreItem(comment.nameColor) : null;
          const liked = comment.likedBy.includes(user.id);
          const canDelete = comment.userId === user.id || user.role === 'admin';

          return (
            <View key={comment.id} style={styles.comment}>
              <View style={[styles.avatarWrap, frame && { borderColor: frame.color, borderWidth: 2 }]}>
                <Text style={styles.avatarText}>{comment.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.commentHead}>
                  <Text style={[styles.name, nameColor && { color: nameColor.color }]} numberOfLines={1}>
                    {comment.username}
                  </Text>
                  {comment.role !== 'user' && (
                    <Text style={[styles.roleTag, { color: ROLE_COLORS[comment.role], borderColor: ROLE_COLORS[comment.role] + '55' }]}>
                      {ROLE_LABELS[comment.role]}
                    </Text>
                  )}
                  <Text style={styles.time}>{formatRelativeTime(comment.createdAt)}</Text>
                </View>
                <Text style={styles.content}>{comment.content}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity accessibilityRole="button" onPress={() => likeComment(marketId, comment.id)}>
                    <Text style={[styles.actionText, liked && { color: colors.danger }]}>
                      {liked ? '\u{2764}' : '\u{2661}'} {comment.likes}
                    </Text>
                  </TouchableOpacity>
                  {canDelete && (
                    <TouchableOpacity accessibilityRole="button" onPress={() => deleteComment(marketId, comment.id)}>
                      <Text style={styles.deleteText}>Xoá</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: 16, marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  count: { color: colors.textFaint, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
  myAvatar: { fontSize: 22, marginBottom: 6 },
  input: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 13, paddingHorizontal: 12, paddingVertical: 9, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center', minHeight: touch.min },
  sendBtnDisabled: { opacity: 0.35 },
  sendText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  comment: { flexDirection: 'row', gap: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, marginBottom: 8 },
  avatarWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft },
  avatarText: { fontSize: 17 },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  name: { color: colors.text, fontSize: 13, fontWeight: '600', maxWidth: 140 },
  roleTag: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, overflow: 'hidden' },
  time: { color: colors.textFaint, fontSize: 12 },
  content: { color: colors.text, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  actionText: { color: colors.textDim, fontSize: 12 },
  deleteText: { color: colors.danger, fontSize: 12 },
});

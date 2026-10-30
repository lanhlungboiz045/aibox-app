// screens/StoreScreen.jsx — Cửa hàng: sink token (khung avatar, màu tên, prompt, creator pass)
import React, { useState } from 'react';
import { BackButton } from '../components/ui/BackButton';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { STORE_CATEGORIES, STORE_ITEMS } from '../data/storeItems';
import { ROLE_LABELS } from '../data/accounts';
import { formatToken, formatTokenShort } from '../utils/format';
import { AppIcon } from '../components/ui/AppIcon';
import { colors, centeredContent, touch } from '../theme/tokens';

export function StoreScreen({ navigation }) {
  const { state, purchaseItem, equipItem } = useApp();
  const insets = useSafeAreaInsets();
  const user = state.user;
  const [category, setCategory] = useState('frame');

  const items = STORE_ITEMS.filter(item => item.type === category);

  const buy = (item) => {
    Alert.alert(
      `Mua ${item.name}`,
      `${item.description}\n\nGiá: ${formatToken(item.price)} token\nSố dư sau khi mua: ${formatToken(user.tokenBalance - item.price)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mua',
          onPress: () => {
            const result = purchaseItem(item.id);
            if (!result.ok) { Alert.alert('Không mua được', result.error); return; }
            Alert.alert('Đã mua', item.type === 'role' ? 'Bạn đã trở thành Market Creator!' : 'Trang bị đã được thêm vào kho.');
          },
        },
      ]
    );
  };

  const owned = (item) => item.type === 'role'
    ? user.role !== 'user'
    : user.inventory.includes(item.id);

  const equipped = (item) => user.equipped?.frame === item.id || user.equipped?.nameColor === item.id;

  const sinkTotal = state.accounts.reduce((sum, a) => sum + (a.totalSpentOnStore || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Cửa hàng</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Số dư của bạn</Text>
          <Text style={styles.balanceValue}>{formatToken(user.tokenBalance)} token</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.balanceLabel}>Đã tiêu vào Store</Text>
          <Text style={styles.sinkValue}>{formatTokenShort(sinkTotal)} token</Text>
        </View>
      </View>

      <View style={styles.roleRow}>
        <Text style={styles.roleLabel}>Quyền hiện tại</Text>
        <Text style={styles.roleValue}>{ROLE_LABELS[user.role]}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {STORE_CATEGORIES.map(item => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: category === item.key }}
            key={item.key}
            style={[styles.catChip, category === item.key && styles.catChipActive]}
            onPress={() => setCategory(item.key)}
          >
            <AppIcon name={item.icon} size={14} color={category === item.key ? colors.accentSoft : colors.textDim} />
            <Text style={[styles.catText, category === item.key && styles.catTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {items.map(item => {
        const isOwned = owned(item);
        const isEquipped = equipped(item);
        const affordable = user.tokenBalance >= item.price;

        return (
          <View key={item.id} style={[styles.itemCard, item.type === 'role' && styles.roleCard]}>
            <View style={styles.itemHead}>
              <View style={[styles.itemIconWrap, item.color ? { borderColor: item.color + '88' } : null]}>
                <AppIcon name={item.icon} size={20} color={colors.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, item.color ? { color: item.color } : null]}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                {item.prompt ? <Text style={styles.itemPrompt} numberOfLines={2}>“{item.prompt}”</Text> : null}
              </View>
            </View>

            <View style={styles.itemFooter}>
              <Text style={[styles.price, !affordable && !isOwned && { color: colors.danger }]}>
                {isOwned ? 'Đã sở hữu' : `${formatToken(item.price)} \u{1F4B0}`}
              </Text>

              {isOwned ? (
                (item.type === 'frame' || item.type === 'nameColor') ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.equipBtn, isEquipped && styles.equippedBtn]}
                    onPress={() => equipItem(item.id)}
                  >
                    <Text style={[styles.equipText, isEquipped && { color: colors.success }]}>
                      {isEquipped ? '\u{2713} Đang dùng' : 'Trang bị'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.ownedTag}><Text style={styles.ownedText}>Trong kho</Text></View>
                )
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.buyBtn, !affordable && styles.buyBtnDisabled]}
                  onPress={() => buy(item)}
                  disabled={!affordable}
                >
                  <Text style={styles.buyText}>Mua</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      <Text style={styles.footnote}>
        Cửa hàng là "ống xả" token: mỗi giao dịch mua làm giảm tổng cung. Ở bản thật, mặt hàng và giá phải nằm ở server để tránh sửa local.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minWidth: 50, minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, padding: 16, borderWidth: 1, borderColor: colors.borderSoft },
  balanceLabel: { color: colors.textDim, fontSize: 12 },
  balanceValue: { color: colors.accentSoft, fontSize: 20, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  sinkValue: { color: colors.danger, fontSize: 14, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  roleLabel: { color: colors.textDim, fontSize: 12 },
  roleValue: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  catRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  catChip: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, minHeight: touch.min },
  catChipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  catText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  catTextActive: { color: colors.accentSoft },
  itemCard: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  roleCard: { borderColor: colors.warningBorder, backgroundColor: colors.warningDim },
  itemHead: { flexDirection: 'row', gap: 12 },
  itemIconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  itemName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemDesc: { color: colors.textDim, fontSize: 12, lineHeight: 16, marginTop: 3 },
  itemPrompt: { color: colors.textFaint, fontSize: 12, fontStyle: 'italic', marginTop: 4, lineHeight: 14 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  price: { color: colors.accentSoft, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  buyBtn: { backgroundColor: colors.accentStrong, borderRadius: 8, paddingHorizontal: 18, minHeight: touch.min, justifyContent: 'center', alignItems: 'center' },
  buyBtnDisabled: { opacity: 0.35 },
  buyText: { color: colors.onAccent, fontSize: 13, fontWeight: '700' },
  equipBtn: { backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderSoft, minHeight: touch.min, justifyContent: 'center', alignItems: 'center' },
  equippedBtn: { borderColor: colors.successBorder, backgroundColor: colors.successDim },
  equipText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  ownedTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.surfaceAlt },
  ownedText: { color: colors.textDim, fontSize: 12 },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 12 },
});

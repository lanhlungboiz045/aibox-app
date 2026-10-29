// screens/StoreScreen.jsx — Cửa hàng: sink token (khung avatar, màu tên, prompt, creator pass)
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { STORE_CATEGORIES, STORE_ITEMS } from '../data/storeItems';
import { ROLE_LABELS } from '../data/accounts';
import { formatToken, formatTokenShort } from '../utils/format';

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
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>{'\u{1F6D2}'} Store</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Số dư của bạn</Text>
          <Text style={styles.balanceValue}>{formatToken(user.tokenBalance)} {'\u{1F4B0}'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.balanceLabel}>Đã tiêu vào Store</Text>
          <Text style={styles.sinkValue}>{formatTokenShort(sinkTotal)} {'\u{1F4B0}'}</Text>
        </View>
      </View>

      <View style={styles.roleRow}>
        <Text style={styles.roleLabel}>Quyền hiện tại</Text>
        <Text style={styles.roleValue}>{ROLE_LABELS[user.role]}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {STORE_CATEGORIES.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.catChip, category === item.key && styles.catChipActive]}
            onPress={() => setCategory(item.key)}
          >
            <Text style={[styles.catText, category === item.key && styles.catTextActive]}>{item.icon} {item.label}</Text>
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
                <Text style={styles.itemIcon}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, item.color ? { color: item.color } : null]}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                {item.prompt ? <Text style={styles.itemPrompt} numberOfLines={2}>“{item.prompt}”</Text> : null}
              </View>
            </View>

            <View style={styles.itemFooter}>
              <Text style={[styles.price, !affordable && !isOwned && { color: '#FF6B6B' }]}>
                {isOwned ? 'Đã sở hữu' : `${formatToken(item.price)} \u{1F4B0}`}
              </Text>

              {isOwned ? (
                (item.type === 'frame' || item.type === 'nameColor') ? (
                  <TouchableOpacity
                    style={[styles.equipBtn, isEquipped && styles.equippedBtn]}
                    onPress={() => equipItem(item.id)}
                  >
                    <Text style={[styles.equipText, isEquipped && { color: '#00CE7E' }]}>
                      {isEquipped ? '\u{2713} Đang dùng' : 'Trang bị'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.ownedTag}><Text style={styles.ownedText}>Trong kho</Text></View>
                )
              ) : (
                <TouchableOpacity
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
        Store là "ống xả" token: mỗi giao dịch mua làm giảm tổng cung. Ở bản thật, item và giá phải nằm ở server để tránh sửa local.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, padding: 16, borderWidth: 1, borderColor: '#2A2E36' },
  balanceLabel: { color: '#8E8E93', fontSize: 11 },
  balanceValue: { color: '#A78BFA', fontSize: 20, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  sinkValue: { color: '#FF6B6B', fontSize: 14, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  roleLabel: { color: '#8E8E93', fontSize: 12 },
  roleValue: { color: '#FFB74D', fontSize: 12, fontWeight: '700' },
  catRow: { paddingHorizontal: 16, gap: 6, paddingBottom: 12 },
  catChip: { backgroundColor: '#1A1D24', borderRadius: 8, borderWidth: 1, borderColor: '#2A2E36', paddingHorizontal: 12, paddingVertical: 8, marginRight: 6 },
  catChipActive: { backgroundColor: 'rgba(108, 92, 231, 0.15)', borderColor: '#6C5CE7' },
  catText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  catTextActive: { color: '#FFFFFF' },
  itemCard: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: '#2A2E36' },
  roleCard: { borderColor: 'rgba(255, 183, 77, 0.4)', backgroundColor: 'rgba(255, 183, 77, 0.05)' },
  itemHead: { flexDirection: 'row', gap: 12 },
  itemIconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#22262E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  itemIcon: { fontSize: 22 },
  itemName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  itemDesc: { color: '#8E8E93', fontSize: 11, lineHeight: 16, marginTop: 3 },
  itemPrompt: { color: '#5C5C5C', fontSize: 10, fontStyle: 'italic', marginTop: 4, lineHeight: 14 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#22262E' },
  price: { color: '#A78BFA', fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  buyBtn: { backgroundColor: '#6C5CE7', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
  buyBtnDisabled: { opacity: 0.35 },
  buyText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  equipBtn: { backgroundColor: '#22262E', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2A2E36' },
  equippedBtn: { borderColor: 'rgba(0, 206, 126, 0.4)', backgroundColor: 'rgba(0, 206, 126, 0.1)' },
  equipText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  ownedTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#22262E' },
  ownedText: { color: '#8E8E93', fontSize: 11 },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 12 },
});

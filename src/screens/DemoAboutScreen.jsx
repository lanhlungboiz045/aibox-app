import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/ui/AppHeader';
import { centeredContent, colors, spacing, type } from '../theme/tokens';

const NOTES = [
  {
    title: 'Tài khoản và dữ liệu',
    body: 'Hồ sơ và số dư được lưu theo tài khoản của bạn. Lịch sử trò chuyện, khóa API và giao dịch được giữ trên thiết bị này.',
  },
  {
    title: 'Thông báo và nhiệm vụ',
    body: 'Thông báo trong ứng dụng và tiến độ nhiệm vụ được cập nhật khi bạn sử dụng. Ứng dụng chưa gửi thông báo đẩy ra ngoài.',
  },
  {
    title: 'AI',
    body: 'Khi chưa kết nối nhà cung cấp AI, ứng dụng trả lời ở chế độ mô phỏng. Khóa API của bạn chỉ lưu trên thiết bị và luôn được che trong danh sách.',
  },
  {
    title: 'Nạp token và Tài Xỉu',
    body: 'Thanh toán nạp token là mô phỏng, không phát sinh giao dịch thật. Token là điểm nội bộ, không có giá trị tiền tệ và không thể đổi thành tiền.',
  },
  {
    title: 'Quản trị và thống kê',
    body: 'Số liệu trong màn quản trị được tổng hợp từ dữ liệu trên thiết bị. Chi phí AI có thể được ước lượng nếu nhà cung cấp không trả về số token.',
  },
  {
    title: 'Quyền riêng tư',
    body: 'Bạn có thể thu hồi khóa API, xoá lịch sử trò chuyện và đặt lại ví bất cứ lúc nào trong phần tài khoản.',
  },
];

export function DemoAboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <AppHeader navigation={navigation} title="Về AIBox" />
      <ScrollView contentContainerStyle={[centeredContent, styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Text style={styles.intro}>
          AIBox gồm AI Hub, ví token nội bộ và trò chơi Tài Xỉu. Dưới đây là những điều cần biết khi sử dụng.
        </Text>
        {NOTES.map(note => (
          <View key={note.title} style={styles.section}>
            <Text style={styles.title}>{note.title}</Text>
            <Text style={styles.body}>{note.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  intro: { ...type.body, color: colors.text, marginBottom: spacing.xs },
  section: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.lg, gap: spacing.xs },
  title: { ...type.bodyStrong, color: colors.text },
  body: { ...type.body, color: colors.textDim },
});

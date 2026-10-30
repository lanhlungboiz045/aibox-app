import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/ui/AppHeader';
import { centeredContent, colors, spacing, type } from '../theme/tokens';

const NOTES = [
  {
    title: 'Tài khoản và dữ liệu',
    body: 'Hồ sơ được đồng bộ với Firebase khi cấu hình khả dụng. Ví token, lịch sử giao dịch, nhiệm vụ và một số tuỳ chọn được lưu trên thiết bị theo tài khoản. Quyền ở giao diện không thay thế kiểm tra quyền ở Firestore Rules hoặc backend.',
  },
  {
    title: 'Thông báo và nhiệm vụ',
    body: 'Thông báo trong ứng dụng và tiến độ nhiệm vụ hiện được xử lý ở thiết bị. Bản demo chưa gửi push notification và chưa xác thực tiến độ ở máy chủ.',
  },
  {
    title: 'AI',
    body: 'Khi chưa cấu hình nhà cung cấp AI, ứng dụng dùng câu trả lời mô phỏng. API key cá nhân được lưu trên thiết bị; các biến EXPO_PUBLIC_* nằm trong ứng dụng phía client. Đây chỉ là cách cấu hình cho bản demo. Khi phát hành thật, hãy lưu khóa ở backend/proxy và để ứng dụng gọi máy chủ đó.',
  },
  {
    title: 'Nạp token và Tài Xỉu',
    body: 'Thanh toán nạp token là mô phỏng, không phát sinh giao dịch thật. Token chỉ là credit nội bộ, không có giá trị tiền tệ và không thể đổi thành tiền.',
  },
  {
    title: 'Quản trị và thống kê',
    body: 'Cảnh báo rủi ro và dữ liệu ví trong màn quản trị là phân tích trên dữ liệu có sẵn ở thiết bị. Nếu nhà cung cấp AI không trả về usage, chi phí có thể được ước lượng.',
  },
  {
    title: 'Thông báo',
    body: 'Danh sách thông báo hiện được tạo trong ứng dụng. Bản demo chưa gửi push notification qua Firebase Cloud Messaging.',
  },
  {
    title: 'Trước khi phát hành',
    body: 'Cần chuyển các thao tác nhạy cảm như số dư, giao dịch, phân quyền, tiến độ nhiệm vụ và phân tích rủi ro sang dịch vụ backend đáng tin cậy; tích hợp cổng thanh toán và push notification thực. Các cấu hình EXPO_PUBLIC_* không được dùng để giữ bí mật.',
  },
];

export function DemoAboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <AppHeader navigation={navigation} title="Về bản demo" />
      <ScrollView contentContainerStyle={[centeredContent, styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Text style={styles.intro}>
          AIBox là ứng dụng thử nghiệm AI Hub, ví token nội bộ và trò chơi Tài Xỉu. Những giới hạn của bản demo được ghi rõ bên dưới.
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

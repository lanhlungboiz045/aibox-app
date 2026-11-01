// components/ErrorBoundary.jsx — Chặn màn hình trắng khi 1 component render lỗi
//
// React chỉ gọi componentDidCatch cho lỗi trong render/lifecycle (không bắt được
// lỗi trong event handler hay async). Với app demo, đây là lưới an toàn cuối:
// hiện thông báo + nút thử lại thay vì trắng màn hình.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { colors, radius, spacing, type } from '../theme/tokens';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Giữ log cho dev; production có thể gửi lên crash reporter.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} maxFontSizeMultiplier={1.6}>
            Có lỗi xảy ra
          </Text>
          <Text style={styles.body} maxFontSizeMultiplier={1.6}>
            Màn hình này gặp sự cố khi hiển thị. Bạn thử lại được ngay, dữ liệu
            trên máy vẫn được giữ nguyên.
          </Text>
          {__DEV__ ? (
            <Text style={styles.dev} maxFontSizeMultiplier={1.4}>
              {String(error && error.message ? error.message : error)}
            </Text>
          ) : null}
          <Button label="Thử lại" onPress={this.handleRetry} />
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...type.h1, color: colors.text },
  body: { ...type.body, color: colors.textDim },
  dev: {
    ...type.small,
    color: colors.danger,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});

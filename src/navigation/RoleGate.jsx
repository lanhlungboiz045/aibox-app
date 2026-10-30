import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppIcon } from '../components/ui/AppIcon';
import { colors, touch } from '../theme/tokens';

export function RoleGate({ screen: Screen, allowedRoles, ...screenProps }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();

  if (allowedRoles.includes(state.user?.role)) {
    return <Screen {...screenProps} />;
  }

  const returnHome = () => {
    if (screenProps.navigation.canGoBack()) screenProps.navigation.goBack();
    else screenProps.navigation.navigate('Home');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <AppIcon name="lock" size={30} color={colors.textDim} />
      <Text style={styles.title}>Bạn không có quyền truy cập</Text>
      <Text style={styles.message}>Màn hình này chỉ dành cho tài khoản có quyền phù hợp.</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={returnHome}>
        <Text style={styles.buttonText}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.bg,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  message: { color: colors.textDim, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  button: {
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.accentStrong,
  },
  buttonText: { color: colors.bg, fontSize: 14, fontWeight: '700' },
});

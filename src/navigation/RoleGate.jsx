import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppIcon } from '../components/ui/AppIcon';
import { AppHeader, Button } from '../components/ui';
import { colors } from '../theme/tokens';

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
    <View style={styles.root}>
      <AppHeader navigation={screenProps.navigation} title="Không có quyền truy cập" />
      <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
        <AppIcon name="lock" size={30} color={colors.textDim} />
        <Text style={styles.title}>Bạn không có quyền truy cập</Text>
        <Text style={styles.message}>Màn hình này chỉ dành cho tài khoản có quyền phù hợp.</Text>
        <Button label="Quay lại" style={styles.returnButton} onPress={returnHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.bg,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  message: { color: colors.textDim, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  returnButton: { marginTop: 20 },
});

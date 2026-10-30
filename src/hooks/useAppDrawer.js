// hooks/useAppDrawer.js — state mở/đóng AppDrawer dùng chung cho 5 màn chính.
// Từ khi bỏ bottom tab bar, drawer là đường điều hướng chính nên màn nào cũng cần.
// Cách dùng:
//   const { open, drawerProps } = useAppDrawer();
//   <IconButton icon="menu" onPress={open} ... />
//   <AppDrawer {...drawerProps} />
import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

export function useAppDrawer() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  return { visible, open, close, drawerProps: { visible, onClose: close, navigation } };
}

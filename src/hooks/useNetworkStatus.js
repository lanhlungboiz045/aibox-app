// hooks/useNetworkStatus.js — Theo dõi kết nối mạng (Bước 4)
//
// NetInfo trả 2 cờ: isConnected (có mạng) và isInternetReachable (ra được internet).
// Chỉ coi là offline khi một trong hai chắc chắn false — giá trị null (chưa xác định)
// được xem như online để không chặn nhầm người dùng.
import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [status, setStatus] = useState({ ready: false, isOffline: false, type: null });
  const mountedRef = useRef(true);

  const apply = useCallback((s) => {
    if (!mountedRef.current || !s) return;
    const offline = s.isConnected === false || s.isInternetReachable === false;
    setStatus({ ready: true, isOffline: offline, type: s.type || null });
  }, []);

  // Kiểm tra lại ngay (dùng cho nút "Thử lại" trong OfflineBar)
  const refresh = useCallback(
    () => NetInfo.refetch().then(apply).catch(() => {}),
    [apply]
  );

  useEffect(() => {
    mountedRef.current = true;
    // Lấy trạng thái ngay lập tức (addEventListener có thể chậm 1 nhịp)
    NetInfo.fetch().then(apply).catch(() => {});
    const unsubscribe = NetInfo.addEventListener(apply);
    return () => {
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, [apply]);

  return { ...status, refresh };
}

// data/storeItems.js — Cửa hàng tiêu token (sink chống lạm phát)
export const STORE_CATEGORIES = [
  { key: 'frame', label: 'Khung avatar', icon: 'image' },
  { key: 'nameColor', label: 'Màu tên', icon: 'droplet' },
  { key: 'prompt', label: 'Prompt AI', icon: 'message-square' },
  { key: 'role', label: 'Đặc quyền', icon: 'shield' },
];

export const STORE_ITEMS = [
  // Khung avatar
  { id: 'frame_gold', type: 'frame', name: 'Khung Vàng', price: 5000, color: '#FFD700', icon: 'award', description: 'Khung avatar viền vàng cho profile và comment' },
  { id: 'frame_neon', type: 'frame', name: 'Khung Neon', price: 3000, color: '#00CE7E', icon: 'heart', description: 'Viền xanh neon, hợp dân crypto' },
  { id: 'frame_fire', type: 'frame', name: 'Khung Lửa', price: 4000, color: '#FF6B6B', icon: 'zap', description: 'Khung đỏ rực cho người chơi hệ liều' },
  { id: 'frame_violet', type: 'frame', name: 'Khung Tím', price: 2500, color: '#A78BFA', icon: 'circle', description: 'Khung tím thanh lịch' },

  // Màu tên
  { id: 'color_gold', type: 'nameColor', name: 'Tên Vàng', price: 2500, color: '#FFD700', icon: 'star', description: 'Tên hiển thị màu vàng trên Leaderboard' },
  { id: 'color_mint', type: 'nameColor', name: 'Tên Mint', price: 1500, color: '#00CE7E', icon: 'leaf', description: 'Tên hiển thị màu xanh mint' },
  { id: 'color_violet', type: 'nameColor', name: 'Tên Tím', price: 1500, color: '#A78BFA', icon: 'circle', description: 'Tên hiển thị màu tím' },

  // Prompt AI
  { id: 'prompt_alpha', type: 'prompt', name: 'Prompt Alpha Hunter', price: 1200, icon: 'search', description: 'Tìm kèo lệch giá: "So sánh giá YES với xác suất thực tế, chỉ ra kèo lệch > 10%"', prompt: 'Phân tích market này, so sánh giá YES với xác suất thực tế và chỉ ra kèo lệch trên 10%.' },
  { id: 'prompt_risk', type: 'prompt', name: 'Prompt Risk Manager', price: 1500, icon: 'shield', description: 'Đánh giá rủi ro: "Liệt kê 3 rủi ro lớn nhất khi mua YES/NO ở kèo này"', prompt: 'Liệt kê 3 rủi ro lớn nhất khi mua YES/NO ở kèo này và cách giới hạn vốn.' },
  { id: 'prompt_news', type: 'prompt', name: 'Prompt News Check', price: 1000, icon: 'file-text', description: 'Kiểm tra tin tức: "Tin mới nào có thể làm giá YES thay đổi?"', prompt: 'Tin tức nào trong 7 ngày qua có thể làm giá YES của kèo này thay đổi?' },

  // Đặc quyền
  { id: 'creator_pass', type: 'role', name: 'Market Creator Pass', price: 50000, icon: 'shield', description: 'Mở quyền tự tạo Prediction Market + nhận 2% fee trên volume market của bạn' },
];

export function getStoreItem(itemId) {
  return STORE_ITEMS.find(item => item.id === itemId) || null;
}

export function itemsByType(type) {
  return STORE_ITEMS.filter(item => item.type === type);
}

// utils/modelLabels.js — Nhãn tiếng Việt cho loại mô hình và khả năng
// Dữ liệu mô hình lưu khóa kỹ thuật (text/image/code, chat/reasoning...),
// chỉ chuyển sang tiếng Việt ở lớp hiển thị để không lẫn Anh-Việt trên UI.
const CAPABILITY_LABELS = {
  chat: 'Trò chuyện',
  reasoning: 'Suy luận',
  code: 'Viết mã',
  vision: 'Hình ảnh',
  writing: 'Viết lách',
  'image-generation': 'Tạo ảnh',
};

const MODEL_TYPE_LABELS = {
  text: 'Văn bản',
  image: 'Hình ảnh',
  code: 'Mã nguồn',
};

export function capabilityLabel(key) {
  return CAPABILITY_LABELS[key] || 'Khác';
}

export function modelTypeLabel(type) {
  return MODEL_TYPE_LABELS[type] || 'Khác';
}

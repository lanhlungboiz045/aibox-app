// config/ai.js — Cấu hình gọi AI thật (chuẩn OpenAI-compatible)
//
// Hầu hết nhà cung cấp/model gateway hiện nay đều dùng chung một API:
//   POST {BASE_URL}/chat/completions
//   Authorization: Bearer <API_KEY>
// nên chỉ cần đổi BASE_URL + KEY + MODEL là chạy được OpenAI, OpenRouter,
// DeepSeek, Groq, Gemini (OpenAI-compat), AI Box, Ollama/LM Studio...
//
// Giá trị mặc định đọc từ .env (xem .env.example):
//   EXPO_PUBLIC_AI_BASE_URL, EXPO_PUBLIC_AI_API_KEY,
//   EXPO_PUBLIC_AI_MODEL, EXPO_PUBLIC_AI_FORCE_MODEL
//
// Người dùng còn sửa được ngay trong app (Profile → Cấu hình AI) và lưu vào
// AsyncStorage — tiện test trên điện thoại mà không phải build lại.

const env = process.env;

// Bộ cấu hình mẫu: bấm 1 nút là điền Base URL + model gợi ý
export const AI_PRESETS = [
  {
    id: 'pollinations',
    name: 'Pollinations (miễn phí)',
    icon: 'sun',
    baseUrl: 'https://text.pollinations.ai/openai',
    model: 'openai',
    hint: 'Miễn phí, không cần khóa · có thể bị giới hạn tốc độ (thử nhanh rất tiện)',
    keyless: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'cpu',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: 'Khóa dạng sk-... · platform.openai.com/api-keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: 'globe',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    hint: '1 khóa dùng nhiều mô hình · openrouter.ai/keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'feather',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hint: 'Rẻ, tiếng Việt tốt · platform.deepseek.com',
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: 'zap',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    hint: 'Nhanh, có gói miễn phí · console.groq.com',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: 'star',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.1-flash-lite',
    hint: 'Gói miễn phí · aistudio.google.com/apikey · bản flash-lite trả lời nhanh, không tốn token suy luận',
  },
  {
    id: 'aibox',
    name: 'AI Box',
    icon: 'box',
    baseUrl: 'https://api.ai-box.vn/v1',
    model: 'gpt-4o-mini',
    hint: 'Cổng AI home.ai-box.vn (nếu tài khoản có khóa)',
  },
  {
    id: 'ollama',
    name: 'Ollama / LM Studio',
    icon: 'monitor',
    baseUrl: 'http://192.168.1.10:11434/v1',
    model: 'llama3.1',
    hint: 'Chạy trên máy tính trong cùng Wi-Fi · không cần khóa',
    keyless: true,
  },
];

export const DEFAULT_SYSTEM_PROMPT =
  'Bạn là AIBox Assistant — trợ lý AI trong app AIBox, trả lời bằng tiếng Việt, '
  + 'ngắn gọn, có cấu trúc, thân thiện. Không hứa hẹn lợi nhuận hoặc đưa ra cam kết tài chính.';

// Cấu hình đọc từ .env (dùng làm default, có thể bị override trong app)
export const envAIConfig = {
  baseUrl: String(env.EXPO_PUBLIC_AI_BASE_URL || '').trim(),
  apiKey: String(env.EXPO_PUBLIC_AI_API_KEY || '').trim(),
  model: String(env.EXPO_PUBLIC_AI_MODEL || 'gpt-4o-mini').trim(),
  // true (mặc định): mọi model trong app đều gọi bằng model ở trên
  forceModel: String(env.EXPO_PUBLIC_AI_FORCE_MODEL || 'true').trim() !== 'false',
  systemPrompt: String(env.EXPO_PUBLIC_AI_SYSTEM_PROMPT || '').trim() || DEFAULT_SYSTEM_PROMPT,
};

// Map model trong app → model thật của nhà cung cấp (chỉ dùng khi forceModel = false)
export const APP_MODEL_MAP = {
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-3-haiku': 'claude-3-haiku-20240307',
  'gemini-pro': 'gemini-1.5-pro',
  'gemini-flash': 'gemini-1.5-flash',
  'llama-3-70b': 'meta-llama/Meta-Llama-3-70B-Instruct',
  'deepseek-coder': 'deepseek-coder',
};

// URL nội bộ / LAN thì không bắt buộc API key (Ollama, LM Studio...)
export function isLocalBaseUrl(baseUrl) {
  const url = String(baseUrl || '').toLowerCase();
  if (!url) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url);
}

// Gateway công khai không cần API key (Pollinations...)
export function isKeylessBaseUrl(baseUrl) {
  const url = String(baseUrl || '').toLowerCase();
  if (!url) return false;
  return url.includes('pollinations.ai');
}

// Có được phép để trống API key không? (local LAN hoặc gateway keyless)
export function allowsEmptyApiKey(baseUrl) {
  return isLocalBaseUrl(baseUrl) || isKeylessBaseUrl(baseUrl);
}

// Đủ điều kiện gọi thật chưa?
export function isAIConfigured(config) {
  if (!config || !config.baseUrl) return false;
  if (config.apiKey) return true;
  return allowsEmptyApiKey(config.baseUrl);
}

// Che key khi hiển thị: sk-abcd…wxyz
export function maskApiKey(apiKey) {
  const key = String(apiKey || '');
  if (!key) return '';
  if (key.length <= 10) return `${key.slice(0, 2)}••••`;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

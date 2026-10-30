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
    name: 'Pollinations (free)',
    icon: '\u{1F338}',
    baseUrl: 'https://text.pollinations.ai/openai',
    model: 'openai',
    hint: 'Miễn phí, không cần key · có thể bị giới hạn tốc độ (test nhanh rất tiện)',
    keyless: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '\u{1F9E0}',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: 'Key dạng sk-... · platform.openai.com/api-keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '\u{1F310}',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    hint: '1 key dùng nhiều model · openrouter.ai/keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '\u{1F433}',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hint: 'Rẻ, tiếng Việt tốt · platform.deepseek.com',
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '\u{26A1}',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    hint: 'Nhanh, có free tier · console.groq.com',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '\u{2728}',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    hint: 'Có free tier · aistudio.google.com/apikey',
  },
  {
    id: 'aibox',
    name: 'AI Box',
    icon: '\u{1F4E6}',
    baseUrl: 'https://api.ai-box.vn/v1',
    model: 'gpt-4o-mini',
    hint: 'Cổng AI home.ai-box.vn (nếu tài khoản có key)',
  },
  {
    id: 'ollama',
    name: 'Ollama / LM Studio',
    icon: '\u{1F4BB}',
    baseUrl: 'http://192.168.1.10:11434/v1',
    model: 'llama3.1',
    hint: 'Chạy trên máy tính trong cùng Wi-Fi · không cần key',
    keyless: true,
  },
];

export const DEFAULT_SYSTEM_PROMPT =
  'Bạn là AIBox Assistant — trợ lý AI trong app AIBox, trả lời bằng tiếng Việt, '
  + 'ngắn gọn, có cấu trúc, thân thiện. Khi được hỏi về prediction market, hãy nêu '
  + 'luận điểm 2 phía YES/NO, rủi ro và gợi ý quản trị vốn. Không hứa hẹn lợi nhuận, '
  + 'không đưa lời khuyên đầu tư chắc chắn.';

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
  'gemini-1-5-pro': 'gemini-1.5-pro',
  'gemini-1-5-flash': 'gemini-1.5-flash',
  'llama-3-1-405b': 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  'mistral-large': 'mistral-large-latest',
  'deepseek-v3': 'deepseek-chat',
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

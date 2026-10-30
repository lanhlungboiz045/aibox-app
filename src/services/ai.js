// services/ai.js — Gọi AI thật qua API chuẩn OpenAI-compatible
//
// Cách dùng:
//   const r = await chatComplete({ appModelId: 'gpt-4o-mini', messages });
//   r.ok ? r.text : r.error
//
// Cấu hình lấy theo thứ tự ưu tiên: giá trị lưu trong app (AsyncStorage)
// → .env → mặc định. Không có cấu hình thì trả mode 'mock' để app vẫn demo được.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_MODEL_MAP,
  DEFAULT_SYSTEM_PROMPT,
  allowsEmptyApiKey,
  envAIConfig,
  isAIConfigured,
  isKeylessBaseUrl,
  isLocalBaseUrl,
  maskApiKey,
} from '../config/ai';

export const AI_SETTINGS_KEY = '@aibox_ai_settings_v1';

// Cache đồng bộ để màn hình đọc ngay không cần await
let runtime = null;

function normalize(raw = {}) {
  const useRaw = raw && typeof raw === 'object' ? raw : {};
  return {
    baseUrl: String(useRaw.baseUrl ?? envAIConfig.baseUrl ?? '').trim().replace(/\/+$/, ''),
    apiKey: String(useRaw.apiKey ?? envAIConfig.apiKey ?? '').trim(),
    model: String(useRaw.model ?? envAIConfig.model ?? 'gpt-4o-mini').trim(),
    forceModel: useRaw.forceModel === undefined ? envAIConfig.forceModel : Boolean(useRaw.forceModel),
    systemPrompt: String(useRaw.systemPrompt ?? envAIConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT).trim()
      || DEFAULT_SYSTEM_PROMPT,
    customized: Boolean(useRaw.customized),
  };
}

// Nạp cấu hình từ AsyncStorage (gọi 1 lần lúc app start)
export async function loadAISettings() {
  if (runtime) return runtime;
  try {
    const raw = await AsyncStorage.getItem(AI_SETTINGS_KEY);
    runtime = normalize(raw ? JSON.parse(raw) : {});
  } catch (e) {
    if (__DEV__) console.warn('[ai] Không đọc được cấu hình AI:', e);
    runtime = normalize({});
  }
  return runtime;
}

export function getAISettings() {
  return runtime || normalize({});
}

export async function saveAISettings(patch = {}) {
  const next = normalize({ ...getAISettings(), ...patch, customized: true });
  runtime = next;
  try {
    await AsyncStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
  } catch (e) {
    if (__DEV__) console.warn('[ai] Không lưu được cấu hình AI:', e);
  }
  return next;
}

export async function resetAISettings() {
  runtime = normalize({});
  try {
    await AsyncStorage.removeItem(AI_SETTINGS_KEY);
  } catch (e) {
    if (__DEV__) console.warn('[ai] Không xoá được cấu hình AI:', e);
  }
  return runtime;
}

// Trạng thái gọn để hiển thị UI
export function getAIStatus() {
  const cfg = getAISettings();
  const live = isAIConfigured(cfg);
  return {
    mode: live ? 'live' : 'mock',
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    maskedKey: maskApiKey(cfg.apiKey),
    hasKey: Boolean(cfg.apiKey),
    forceModel: cfg.forceModel,
    customized: cfg.customized,
    local: isLocalBaseUrl(cfg.baseUrl),
    keyless: isKeylessBaseUrl(cfg.baseUrl),
    // Được phép để trống key (local LAN hoặc gateway keyless)
    allowsEmptyKey: allowsEmptyApiKey(cfg.baseUrl),
  };
}

export function isLiveMode() {
  return isAIConfigured(getAISettings());
}

// Chọn model thật sẽ gửi lên API
export function resolveModel(appModelId, cfg = getAISettings()) {
  const fallback = cfg.model || 'gpt-4o-mini';
  if (cfg.forceModel) return fallback;
  return APP_MODEL_MAP[appModelId] || appModelId || fallback;
}

// Ghép lịch sử chat + prompt mới thành messages của OpenAI API
export function buildChatMessages({ history = [], prompt = '', systemPrompt, limit = 10 } = {}) {
  const cfg = getAISettings();
  const system = String(systemPrompt || cfg.systemPrompt || DEFAULT_SYSTEM_PROMPT).trim();
  const trimmed = (Array.isArray(history) ? history : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-limit)
    .map(m => ({ role: m.role, content: m.content }));
  const messages = [{ role: 'system', content: system }, ...trimmed];
  if (prompt) messages.push({ role: 'user', content: String(prompt) });
  return messages;
}

function hostOf(url) {
  const raw = String(url || '');
  // URL của React Native không có getter .host → fallback regex
  try {
    const parsed = new URL(raw);
    if (parsed.host) return parsed.host;
  } catch {
    // bỏ qua, dùng regex bên dưới
  }
  const match = raw.match(/^[a-z]+:\/\/([^/:]+)(?::(\d+))?/i);
  if (match) return match[2] ? `${match[1]}:${match[2]}` : match[1];
  return raw || '(chưa có Base URL)';
}

// Lấy text từ response chuẩn OpenAI (hỗ trợ cả content dạng mảng part)
function extractText(data) {
  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  if (!choice) return '';
  const content = choice.message ? choice.message.content : choice.text;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => (typeof part === 'string' ? part : part && part.text ? part.text : ''))
      .join('')
      .trim();
  }
  return '';
}

// Dịch lỗi HTTP sang tiếng Việt, kèm message gốc của nhà cung cấp
function describeHttpError(status, data, raw) {
  const providerMsg = String(
    (data && data.error && (data.error.message || data.error.code))
    || (data && data.message)
    || raw
    || ''
  ).slice(0, 300);

  const map = {
    400: 'Yêu cầu không hợp lệ (HTTP 400) — có thể sai tên model hoặc tham số.',
    401: 'API key không hợp lệ hoặc đã bị thu hồi (HTTP 401). Kiểm tra lại key.',
    402: 'Tài khoản nhà cung cấp đã hết credit (HTTP 402).',
    403: 'Key không có quyền gọi model này (HTTP 403).',
    404: 'Không tìm thấy endpoint hoặc model (HTTP 404). Base URL thường phải kết thúc bằng /v1.',
    413: 'Prompt quá dài (HTTP 413). Hãy rút ngắn câu hỏi.',
    422: 'Tham số gửi lên không hợp lệ (HTTP 422).',
    429: 'Bị giới hạn tốc độ hoặc hết quota (HTTP 429). Chờ vài giây rồi thử lại.',
  };
  let text = map[status];
  if (!text && status >= 500) text = `Nhà cung cấp AI đang lỗi (HTTP ${status}). Thử lại sau ít phút.`;
  if (!text) text = `Gọi AI thất bại (HTTP ${status}).`;
  return providerMsg ? `${text}\n${providerMsg}` : text;
}

// 1 lần gọi mạng
async function requestOnce({ baseUrl, apiKey, model, messages, temperature, maxTokens, timeoutMs, signal }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  // Người dùng bấm "Dừng" → huỷ request đang chờ (không trừ token vì chưa có kết quả)
  let canceled = false;
  const onAbort = () => {
    canceled = true;
    controller.abort();
  };
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort);
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    const latencyMs = Date.now() - startedAt;

    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Gateway trả HTML/text (sai URL, captive portal, trang lỗi...) → báo rõ
      return {
        ok: false,
        status: res.status,
        latencyMs,
        model,
        code: 'INVALID_JSON',
        error: `Máy chủ trả về dữ liệu không phải JSON (HTTP ${res.status}). Kiểm tra Base URL có đúng .../v1 không.\n${String(raw).slice(0, 200)}`,
      };
    }

    // Gemini (OpenAI-compat) đôi khi bọc kết quả trong mảng 1 phần tử
    if (Array.isArray(data)) data = data[0] || null;

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        latencyMs,
        model,
        code: (data && data.error && (data.error.code || data.error.type)) || '',
        error: describeHttpError(res.status, data, ''),
      };
    }

    const text = extractText(data);
    if (!text) {
      // Model "thinking" (Gemini 2.5+/3.x) có thể dùng hết max_tokens cho phần
      // suy luận nội bộ → content rỗng dù HTTP 200.
      const finish = data && data.choices && data.choices[0] && data.choices[0].finish_reason;
      return {
        ok: false,
        status: res.status,
        latencyMs,
        model,
        finishReason: finish,
        code: finish === 'length' ? 'EMPTY_LENGTH' : 'EMPTY_CONTENT',
        error: finish === 'length'
          ? 'AI trả về nội dung rỗng vì model dùng hết token cho phần suy luận (thinking). Tăng max token trong prompt hoặc đổi sang model nhẹ hơn (vd gemini-3.1-flash-lite).'
          : 'AI trả về nội dung rỗng. Thử lại hoặc đổi model.',
      };
    }

    return {
      ok: true,
      text,
      model: (data && data.model) || model,
      usage: (data && data.usage) || null,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    if (err && err.name === 'AbortError') {
      if (canceled) {
        return {
          ok: false,
          canceled: true,
          latencyMs,
          model,
          error: 'Bạn đã dừng yêu cầu.',
        };
      }
      return {
        ok: false,
        latencyMs,
        model,
        timeout: true,
        error: `Hết thời gian chờ (${Math.round(timeoutMs / 1000)}s). Mạng chậm hoặc model đang quá tải.`,
      };
    }
    return {
      ok: false,
      latencyMs,
      model,
      network: true,
      error: `Không kết nối được tới ${hostOf(baseUrl)}.\nKiểm tra Wi-Fi/mạng, hoặc Base URL (điện thoại không truy cập được localhost của máy tính — dùng IP LAN).\n${err && err.message ? err.message : err}`,
    };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

// Gọi chat completion, tự thử lại bằng model mặc định nếu model chọn bị lỗi
export async function chatComplete({
  appModelId,
  messages,
  temperature = 0.7,
  // Model "thinking" tiêu tốn token cho suy luận trước khi trả lời → để rộng tay
  maxTokens = 1500,
  // Model "thinking" có thể lâu hơn; 60s an toàn cho mạng di động
  timeoutMs = 60000,
  // Cho phép màn hình huỷ giữa chừng (nút Dừng)
  signal,
} = {}) {
  const cfg = getAISettings();
  if (!isAIConfigured(cfg)) {
    return {
      ok: false,
      mode: 'mock',
      error: 'Chưa cấu hình AI. Vào Profile → Cấu hình AI để chọn nhà cung cấp (ví dụ preset Pollinations miễn phí, không cần key).',
    };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, mode: 'live', error: 'Không có nội dung để gửi.' };
  }

  const requested = resolveModel(appModelId, cfg);
  const chain = requested === cfg.model ? [requested] : [requested, cfg.model];

  let last = null;
  for (let i = 0; i < chain.length; i += 1) {
    const model = chain[i];
    last = await requestOnce({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model,
      messages,
      temperature,
      maxTokens,
      timeoutMs,
      signal,
    });
    if (last.ok) return { ...last, mode: 'live' };
    // Người dùng đã dừng → không thử model dự phòng
    if (last.canceled) return { ...last, mode: 'live' };

    // Chỉ thử lại khi nghi lỗi tên model, còn lỗi key/mạng thì dừng luôn
    const looksLikeModelError = last.status === 404
      || /model/i.test(String(last.code || ''))
      || /model/i.test(String(last.error || ''));
    if (!looksLikeModelError) break;
  }

  return { ...(last || {}), ok: false, mode: 'live' };
}

// Nút "Kiểm tra kết nối" trong màn Cấu hình AI
export async function testAIConnection() {
  const startedAt = Date.now();
  const result = await chatComplete({
    messages: [
      { role: 'system', content: 'Bạn là trợ lý kiểm tra kết nối. Trả lời cực ngắn.' },
      { role: 'user', content: 'Trả lời đúng một từ: OK' },
    ],
    temperature: 0,
    // Model thinking (Gemini 3.x) cần chỗ cho token suy luận, đặt quá thấp sẽ rỗng
    maxTokens: 512,
    timeoutMs: 40000,
  });
  return {
    ...result,
    totalMs: Date.now() - startedAt,
    text: result.ok ? String(result.text).slice(0, 120) : '',
  };
}

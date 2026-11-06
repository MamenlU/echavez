const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MODEL = 'gpt-6-luna';

export class AiUnavailableError extends Error {
  constructor(message = 'Rayjin Assistant is temporarily unavailable.') {
    super(message);
    this.name = 'AiUnavailableError';
    this.code = 'AI_UNAVAILABLE';
  }
}

export function getAiConfiguration() {
  return {
    enabled: String(process.env.AI_ENABLED ?? 'true').toLowerCase() !== 'false',
    provider: String(process.env.AI_PROVIDER || 'openai').trim().toLowerCase(),
    model: String(process.env.OPENAI_MODEL || process.env.AI_MODEL || DEFAULT_MODEL).trim(),
    hasApiKey: Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
    autoReplyEnabled: String(process.env.AI_AUTO_REPLY_ENABLED || 'false').toLowerCase() === 'true',
  };
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const pieces = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        pieces.push(content.text);
      }
    }
  }

  return pieces.join('\n').trim();
}

export async function generateAiText({ instructions, input, maxOutputTokens = 500 }) {
  const config = getAiConfiguration();

  if (!config.enabled || config.provider !== 'openai' || !config.hasApiKey) {
    throw new AiUnavailableError();
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(
    3_000,
    Math.min(Number(process.env.AI_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS), 30_000)
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${String(process.env.OPENAI_API_KEY).trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        instructions: String(instructions || '').slice(0, 12_000),
        input: String(input || '').slice(0, 24_000),
        max_output_tokens: Math.max(80, Math.min(Number(maxOutputTokens) || 500, 900)),
        store: false,
      }),
    });

    if (!response.ok) {
      throw new AiUnavailableError();
    }

    const payload = await response.json();
    const text = extractOutputText(payload);

    if (!text) {
      throw new AiUnavailableError();
    }

    return {
      text,
      model: payload?.model || config.model,
      usage: payload?.usage || null,
    };
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    throw new AiUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}

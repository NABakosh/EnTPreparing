/**
 * Слой ИИ-провайдера. Оба провайдера — OpenAI-совместимый Chat Completions API.
 * AI_PROVIDER=cerebras|openai. Ключи только в env.
 */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatOptions = { temperature?: number; maxTokens?: number; json?: boolean; timeoutMs?: number };

export interface AIProvider {
  name: string;
  model: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export class AIError extends Error {
  constructor(public code: "ai_not_configured" | "ai_timeout" | "ai_failed" | "ai_rate_limited", message?: string) {
    super(message ?? code);
  }
}

function openAICompatible(name: string, baseUrl: string, apiKey: string | undefined, model: string): AIProvider {
  return {
    name,
    model,
    async chat(messages, opts = {}) {
      if (!apiKey) throw new AIError("ai_not_configured", `${name}: API key is not set`);
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS || 30000));
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          signal: ctrl.signal,
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.2,
            max_completion_tokens: opts.maxTokens ?? 1200,
            ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        if (res.status === 429) throw new AIError("ai_rate_limited", `${name}: 429`);
        if (!res.ok) throw new AIError("ai_failed", `${name}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new AIError("ai_failed", `${name}: empty response`);
        return text;
      } catch (e) {
        if (e instanceof AIError) throw e;
        if ((e as Error).name === "AbortError") throw new AIError("ai_timeout");
        throw new AIError("ai_failed", (e as Error).message);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function getProvider(): AIProvider {
  const which = (process.env.AI_PROVIDER || "cerebras").toLowerCase();
  if (which === "openai") {
    return openAICompatible("openai", process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL || "gpt-6.1-terra");
  }
  return openAICompatible("cerebras", process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1", process.env.CEREBRAS_API_KEY, process.env.CEREBRAS_MODEL || "gpt-oss-120b");
}

export function chat(messages: ChatMessage[], opts?: ChatOptions) {
  return getProvider().chat(messages, opts);
}

/** Повторные попытки с экспоненциальной задержкой (для скриптов). */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 2000): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (e instanceof AIError && e.code === "ai_not_configured") throw e;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}

/** Достаёт JSON из ответа модели (на случай обёртки ```json). */
export function parseJsonLoose<T>(text: string): T {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (m ? m[1] : text).trim();
  const start = raw.search(/[[{]/);
  return JSON.parse(start > 0 ? raw.slice(start) : raw) as T;
}

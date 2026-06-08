import OpenAI from "openai";

export type LlmBackend = "openai" | "openrouter" | "proxy";
export type LlmTask = "analysis" | "letter";

export interface ResolvedLlmConfig {
  backend: LlmBackend;
  apiKey: string;
  baseURL: string;
  model: string;
  displayName: string;
  headers?: Record<string, string>;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function getTaskModel(env: NodeJS.ProcessEnv, fallback: string, task: LlmTask) {
  if (task === "analysis") {
    return env.LLM_ANALYSIS_MODEL || env.LLM_MODEL || fallback;
  }

  return env.LLM_LETTER_MODEL || env.LLM_MODEL || fallback;
}

export function resolveLlmConfig(env: NodeJS.ProcessEnv = process.env, task: LlmTask = "analysis"): ResolvedLlmConfig | null {
  const backend = (env.LLM_BACKEND || "").toLowerCase();

  if (backend === "proxy") {
    const apiKey = env.LLM_PROXY_API_KEY || env.PROXY_API_KEY || "";
    if (!apiKey) return null;

    return {
      backend: "proxy",
      apiKey,
      baseURL: normalizeBaseUrl(env.LLM_PROXY_BASE_URL || "http://127.0.0.1:8000/v1"),
      model: getTaskModel(env, env.LLM_PROXY_MODEL || "openrouter/openai/gpt-4o-mini", task),
      displayName: "LLM Proxy",
    };
  }

  if (backend === "openrouter") {
    const apiKey = env.OPENROUTER_API_KEY || "";
    if (!apiKey) return null;

    const headers: Record<string, string> = {};
    if (env.PUBLIC_APP_URL) {
      headers["HTTP-Referer"] = env.PUBLIC_APP_URL;
    }
    headers["X-Title"] = env.OPENROUTER_APP_NAME || "ClearCredit";

    return {
      backend: "openrouter",
      apiKey,
      baseURL: normalizeBaseUrl(env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"),
      model: getTaskModel(env, env.OPENROUTER_MODEL || "openai/gpt-4o-mini", task),
      displayName: "OpenRouter",
      headers,
    };
  }

  if (backend === "openai" || (!backend && env.OPENAI_API_KEY)) {
    const apiKey = env.OPENAI_API_KEY || "";
    if (!apiKey) return null;

    return {
      backend: "openai",
      apiKey,
      baseURL: normalizeBaseUrl(env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
      model: getTaskModel(env, env.OPENAI_MODEL || "gpt-4o-mini", task),
      displayName: "OpenAI",
    };
  }

  if (!backend && env.OPENROUTER_API_KEY) {
    return resolveLlmConfig({ ...env, LLM_BACKEND: "openrouter" }, task);
  }

  if (!backend && (env.LLM_PROXY_API_KEY || env.PROXY_API_KEY)) {
    return resolveLlmConfig({ ...env, LLM_BACKEND: "proxy" }, task);
  }

  return null;
}

export function isLlmConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(resolveLlmConfig(env, "analysis"));
}

export function getLlmStatus(env: NodeJS.ProcessEnv = process.env) {
  const analysis = resolveLlmConfig(env, "analysis");
  const letter = resolveLlmConfig(env, "letter");

  return {
    configured: Boolean(analysis),
    backend: analysis?.backend || null,
    displayName: analysis?.displayName || null,
    baseURL: analysis?.baseURL || null,
    analysisModel: analysis?.model || null,
    letterModel: letter?.model || null,
  };
}

function getClient(config: ResolvedLlmConfig) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.headers,
  });
}

export async function generateLlmText({
  task,
  system,
  user,
  temperature,
  maxTokens,
}: {
  task: LlmTask;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}) {
  const config = resolveLlmConfig(process.env, task);
  if (!config) {
    throw new Error("No LLM backend is configured. Set LLM_BACKEND plus the matching API key environment variables.");
  }

  const client = getClient(config);
  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  return {
    text: completion.choices[0]?.message?.content || "",
    backend: config.backend,
    model: config.model,
    baseURL: config.baseURL,
  };
}

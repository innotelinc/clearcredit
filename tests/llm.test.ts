import { describe, expect, it } from "vitest";
import { getLlmStatus, resolveLlmConfig } from "../src/lib/llm";

describe("resolveLlmConfig", () => {
  it("resolves direct OpenAI configuration", () => {
    const config = resolveLlmConfig(
      {
        LLM_BACKEND: "openai",
        OPENAI_API_KEY: "openai-key",
        OPENAI_MODEL: "gpt-4o-mini",
      } as unknown as NodeJS.ProcessEnv,
      "analysis",
    );

    expect(config?.backend).toBe("openai");
    expect(config?.baseURL).toBe("https://api.openai.com/v1");
    expect(config?.model).toBe("gpt-4o-mini");
  });

  it("resolves OpenRouter with custom headers", () => {
    const config = resolveLlmConfig(
      {
        LLM_BACKEND: "openrouter",
        OPENROUTER_API_KEY: "router-key",
        PUBLIC_APP_URL: "https://subscribe.innotel.us",
      } as unknown as NodeJS.ProcessEnv,
      "letter",
    );

    expect(config?.backend).toBe("openrouter");
    expect(config?.baseURL).toBe("https://openrouter.ai/api/v1");
    expect(config?.headers?.["HTTP-Referer"]).toBe("https://subscribe.innotel.us");
    expect(config?.headers?.["X-Title"]).toBe("ClearCredit");
  });

  it("resolves proxy backend using Mirrowel proxy defaults", () => {
    const config = resolveLlmConfig(
      {
        LLM_BACKEND: "proxy",
        PROXY_API_KEY: "proxy-key",
      } as unknown as NodeJS.ProcessEnv,
      "analysis",
    );

    expect(config?.backend).toBe("proxy");
    expect(config?.baseURL).toBe("http://127.0.0.1:8000/v1");
    expect(config?.model).toBe("openrouter/owl-alpha");
  });

  it("prefers the local proxy when no backend is set but proxy credentials exist", () => {
    const status = getLlmStatus({
      PROXY_API_KEY: "proxy-key",
      OPENROUTER_API_KEY: "router-key",
    } as unknown as NodeJS.ProcessEnv);

    expect(status.backend).toBe("proxy");
    expect(status.usingLocalProxy).toBe(true);
    expect(status.analysisModel).toBe("openrouter/owl-alpha");
  });
});

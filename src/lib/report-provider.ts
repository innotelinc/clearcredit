import { buildPublicUrl } from "@/lib/url";

export type ReportProviderMode = "disabled" | "mock" | "generic";

export interface ProviderClientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  ssn?: string | null;
  dateOfBirth?: Date | null;
  creditScore?: number | null;
}

export interface ProviderPullResponse {
  status: "completed" | "pending" | "failed" | "skipped";
  provider: string;
  providerReportId?: string;
  bureau?: string | null;
  score?: number | null;
  rawData?: string | null;
  fileUrl?: string | null;
  reason?: string;
}

function getMode(): ReportProviderMode {
  const mode = (process.env.REPORT_PULL_MODE || "disabled").toLowerCase();
  if (mode === "mock" || mode === "generic") return mode;
  return "disabled";
}

function buildMockReport(client: ProviderClientProfile) {
  return `Client: ${client.name}\nBureau: Experian\nScore: ${client.creditScore ?? 612}\nAccounts:\n- Collection account from Midland Credit Management, balance $428, account ending 1822\n- Late payment on Capital One account ending 4455 reported 60 days late\n- Hard inquiry from Unknown Auto Finance on 2025-11-14\n- Personal information mismatch on current address and previous employer listing`;
}

function baseHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.REPORT_PROVIDER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.REPORT_PROVIDER_API_KEY}`;
  }

  if (process.env.REPORT_PROVIDER_ACCOUNT_ID) {
    headers["X-Provider-Account"] = process.env.REPORT_PROVIDER_ACCOUNT_ID;
  }

  return headers;
}

function normalizeGenericResponse(
  payload: Record<string, unknown>,
  fallbackProvider = "generic",
): ProviderPullResponse {
  const statusRaw = typeof payload.status === "string" ? payload.status.toLowerCase() : "failed";
  const status = ["completed", "pending", "failed", "skipped"].includes(statusRaw)
    ? (statusRaw as ProviderPullResponse["status"])
    : "failed";

  return {
    status,
    provider: typeof payload.provider === "string" ? payload.provider : fallbackProvider,
    providerReportId:
      typeof payload.providerReportId === "string"
        ? payload.providerReportId
        : typeof payload.reportId === "string"
          ? payload.reportId
          : undefined,
    bureau: typeof payload.bureau === "string" ? payload.bureau : null,
    score: typeof payload.score === "number" ? payload.score : null,
    rawData: typeof payload.rawData === "string" ? payload.rawData : null,
    fileUrl: typeof payload.fileUrl === "string" ? payload.fileUrl : null,
    reason:
      typeof payload.reason === "string"
        ? payload.reason
        : typeof payload.error === "string"
          ? payload.error
          : undefined,
  };
}

async function genericCreatePull(client: ProviderClientProfile): Promise<ProviderPullResponse> {
  const baseUrl = process.env.REPORT_PROVIDER_BASE_URL;
  const createPath = process.env.REPORT_PROVIDER_CREATE_PATH || "/reports/pull";

  if (!baseUrl) {
    return {
      status: "failed",
      provider: "generic",
      reason: "REPORT_PROVIDER_BASE_URL is not configured",
    };
  }

  const callbackUrl = buildPublicUrl("/api/reports/provider-webhook");
  const res = await fetch(new URL(createPath, baseUrl), {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({
      externalClientId: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      state: client.state,
      zip: client.zip,
      ssn: client.ssn,
      ssnLast4: client.ssn?.slice(-4) || null,
      dateOfBirth: client.dateOfBirth?.toISOString() || null,
      callbackUrl,
      webhookSecret: process.env.REPORT_PROVIDER_WEBHOOK_SECRET || null,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      status: "failed",
      provider: "generic",
      reason:
        typeof payload.error === "string"
          ? payload.error
          : `Provider request failed with status ${res.status}`,
    };
  }

  return normalizeGenericResponse(payload);
}

async function genericPollReport(providerReportId: string): Promise<ProviderPullResponse> {
  const baseUrl = process.env.REPORT_PROVIDER_BASE_URL;
  const statusPathTemplate = process.env.REPORT_PROVIDER_STATUS_PATH || "/reports/:id";

  if (!baseUrl) {
    return {
      status: "failed",
      provider: "generic",
      reason: "REPORT_PROVIDER_BASE_URL is not configured",
    };
  }

  const statusPath = statusPathTemplate.replace(":id", encodeURIComponent(providerReportId));
  const res = await fetch(new URL(statusPath, baseUrl), {
    method: "GET",
    headers: baseHeaders(),
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      status: "failed",
      provider: "generic",
      providerReportId,
      reason:
        typeof payload.error === "string"
          ? payload.error
          : `Provider status check failed with status ${res.status}`,
    };
  }

  return normalizeGenericResponse(payload);
}

export async function requestCreditReport(client: ProviderClientProfile): Promise<ProviderPullResponse> {
  const mode = getMode();

  if (mode === "disabled") {
    return {
      status: "skipped",
      provider: "disabled",
      reason: "No report-pull provider is configured.",
    };
  }

  if (mode === "mock") {
    return {
      status: "completed",
      provider: "mock",
      providerReportId: `mock-${client.id}`,
      bureau: "Experian",
      score: client.creditScore ?? 612,
      rawData: buildMockReport(client),
    };
  }

  return genericCreatePull(client);
}

export async function pollCreditReport(providerReportId: string): Promise<ProviderPullResponse> {
  const mode = getMode();

  if (mode === "mock") {
    return {
      status: "completed",
      provider: "mock",
      providerReportId,
      bureau: "Experian",
      score: 612,
      rawData: buildMockReport({ id: providerReportId, name: "Mock Client", email: "mock@example.com" }),
    };
  }

  if (mode !== "generic") {
    return {
      status: "skipped",
      provider: mode,
      providerReportId,
      reason: "Polling is unavailable because no provider integration is configured.",
    };
  }

  return genericPollReport(providerReportId);
}

export function isRealProviderConfigured() {
  return getMode() === "generic" && Boolean(process.env.REPORT_PROVIDER_BASE_URL);
}

export function getReportProviderMode() {
  return getMode();
}

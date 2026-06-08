import { prisma } from "@/lib/prisma";
import { pollCreditReport, requestCreditReport } from "@/lib/report-provider";

export interface AutomaticReportPullResult {
  status: "created" | "pending" | "skipped" | "failed";
  reportId?: string;
  provider?: string;
  providerReportId?: string;
  reason?: string;
}

async function logActivity(clientId: string, action: string, details: string) {
  await prisma.activityLog.create({
    data: { clientId, action, details },
  });
}

export async function attemptAutomaticReportPull(clientId: string): Promise<AutomaticReportPullResult> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { status: "skipped", reason: "Client not found" };
  }

  const existingCompleted = await prisma.creditReport.findFirst({
    where: { clientId, providerStatus: { in: ["COMPLETED", "UPLOADED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existingCompleted?.rawData) {
    return {
      status: "skipped",
      reportId: existingCompleted.id,
      provider: existingCompleted.provider || undefined,
      providerReportId: existingCompleted.providerReportId || undefined,
      reason: "Client already has a completed credit report on file",
    };
  }

  const existingPending = await prisma.creditReport.findFirst({
    where: { clientId, providerStatus: { in: ["PENDING", "REQUESTED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existingPending) {
    return {
      status: "pending",
      reportId: existingPending.id,
      provider: existingPending.provider || undefined,
      providerReportId: existingPending.providerReportId || undefined,
      reason: "A report pull is already in progress for this client",
    };
  }

  const response = await requestCreditReport({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city,
    state: client.state,
    zip: client.zip,
    ssn: client.ssn,
    dateOfBirth: client.dateOfBirth,
    creditScore: client.creditScore,
  });

  if (response.status === "skipped") {
    await logActivity(clientId, "REPORT_PULL_SKIPPED", response.reason || "Automatic report pull skipped.");
    return {
      status: "skipped",
      provider: response.provider,
      reason: response.reason,
    };
  }

  if (response.status === "failed") {
    const report = await prisma.creditReport.create({
      data: {
        clientId,
        bureau: response.bureau || null,
        score: response.score ?? null,
        provider: response.provider,
        providerReportId: response.providerReportId,
        providerStatus: "FAILED",
        source: "AUTOMATED",
        pullRequestedAt: new Date(),
        pullError: response.reason || "Provider pull failed",
      },
    });
    await logActivity(clientId, "REPORT_PULL_FAILED", response.reason || "Automatic report pull failed.");
    return {
      status: "failed",
      reportId: report.id,
      provider: response.provider,
      providerReportId: response.providerReportId,
      reason: response.reason,
    };
  }

  const report = await prisma.creditReport.create({
    data: {
      clientId,
      bureau: response.bureau || null,
      score: response.score ?? null,
      rawData: response.rawData || null,
      fileUrl: response.fileUrl || null,
      provider: response.provider,
      providerReportId: response.providerReportId,
      providerStatus: response.status === "completed" ? "COMPLETED" : "PENDING",
      source: "AUTOMATED",
      pullRequestedAt: new Date(),
      pullCompletedAt: response.status === "completed" ? new Date() : null,
    },
  });

  await logActivity(
    clientId,
    response.status === "completed" ? "REPORT_PULL_COMPLETED" : "REPORT_PULL_PENDING",
    response.status === "completed"
      ? `Automatic ${response.provider} credit report pull completed.`
      : `Automatic ${response.provider} credit report pull requested and is pending.`,
  );

  return {
    status: response.status === "completed" ? "created" : "pending",
    reportId: report.id,
    provider: response.provider,
    providerReportId: response.providerReportId,
  };
}

export async function syncPendingReport(reportId: string) {
  const report = await prisma.creditReport.findUnique({
    where: { id: reportId },
    include: { client: true },
  });

  if (!report || !report.providerReportId || !["PENDING", "REQUESTED"].includes(report.providerStatus)) {
    return { updated: false, status: report?.providerStatus || "UNKNOWN" };
  }

  const response = await pollCreditReport(report.providerReportId);
  if (response.status === "pending") {
    return { updated: false, status: "PENDING" };
  }

  const updated = await prisma.creditReport.update({
    where: { id: report.id },
    data: {
      bureau: response.bureau || report.bureau,
      score: response.score ?? report.score,
      rawData: response.rawData || report.rawData,
      fileUrl: response.fileUrl || report.fileUrl,
      providerStatus:
        response.status === "completed"
          ? "COMPLETED"
          : response.status === "failed"
            ? "FAILED"
            : report.providerStatus,
      pullCompletedAt: response.status === "completed" ? new Date() : report.pullCompletedAt,
      pullError: response.status === "failed" ? response.reason || "Provider poll failed" : null,
    },
  });

  await logActivity(
    report.clientId,
    response.status === "completed" ? "REPORT_PULL_COMPLETED" : "REPORT_PULL_FAILED",
    response.status === "completed"
      ? `Provider ${response.provider} delivered the requested credit report.`
      : response.reason || `Provider ${response.provider} reported a pull failure.`,
  );

  return { updated: true, status: updated.providerStatus, reportId: updated.id };
}

export async function applyProviderWebhookUpdate(input: {
  provider: string;
  providerReportId: string;
  bureau?: string | null;
  score?: number | null;
  rawData?: string | null;
  fileUrl?: string | null;
  status: "completed" | "pending" | "failed";
  reason?: string;
}) {
  const report = await prisma.creditReport.findUnique({
    where: { providerReportId: input.providerReportId },
  });

  if (!report) {
    throw new Error("No matching report found for provider webhook");
  }

  const updated = await prisma.creditReport.update({
    where: { id: report.id },
    data: {
      provider: input.provider || report.provider,
      bureau: input.bureau || report.bureau,
      score: input.score ?? report.score,
      rawData: input.rawData || report.rawData,
      fileUrl: input.fileUrl || report.fileUrl,
      providerStatus: input.status === "completed" ? "COMPLETED" : input.status === "failed" ? "FAILED" : "PENDING",
      pullCompletedAt: input.status === "completed" ? new Date() : report.pullCompletedAt,
      pullError: input.status === "failed" ? input.reason || "Provider webhook reported a failure" : null,
    },
  });

  await logActivity(
    updated.clientId,
    input.status === "completed" ? "REPORT_PULL_COMPLETED" : input.status === "failed" ? "REPORT_PULL_FAILED" : "REPORT_PULL_PENDING",
    input.status === "completed"
      ? `Provider webhook delivered report ${input.providerReportId}.`
      : input.reason || `Provider webhook updated status to ${input.status}.`,
  );

  return updated;
}

import { prisma } from "@/lib/prisma";

export interface AutomaticReportPullResult {
  status: "created" | "skipped";
  reportId?: string;
  reason?: string;
}

function buildMockReport(name: string) {
  return `Client: ${name}\nBureau: Experian\nScore: 612\nNegative items:\n- Collection account from Midland Credit\n- Late payment on Capital One ending 4455\n- Hard inquiry from Unknown Auto Finance\n- Personal information mismatch on current address`;
}

export async function attemptAutomaticReportPull(clientId: string): Promise<AutomaticReportPullResult> {
  const mode = (process.env.REPORT_PULL_MODE || "disabled").toLowerCase();

  if (mode !== "mock") {
    await prisma.activityLog.create({
      data: {
        clientId,
        action: "REPORT_PULL_SKIPPED",
        details: "Automatic credit report pull skipped because no provider integration is configured.",
      },
    });

    return {
      status: "skipped",
      reason: "No report-pull provider is configured. Set REPORT_PULL_MODE=mock for demo automation or integrate a real provider.",
    };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { status: "skipped", reason: "Client not found" };
  }

  const existingReport = await prisma.creditReport.findFirst({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  if (existingReport) {
    return { status: "skipped", reportId: existingReport.id, reason: "Client already has a credit report on file" };
  }

  const report = await prisma.creditReport.create({
    data: {
      clientId,
      bureau: "Experian",
      rawData: buildMockReport(client.name),
      score: client.creditScore ?? 612,
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId,
      action: "REPORT_PULL_COMPLETED",
      details: "Automatic mock credit report pull completed.",
    },
  });

  return { status: "created", reportId: report.id };
}

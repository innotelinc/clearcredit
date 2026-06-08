import { AccessUser } from "@/lib/access-control";
import { generateDisputeLetter } from "@/lib/ai-letter";
import { prisma } from "@/lib/prisma";
import { analyzeCreditReport } from "@/lib/report-analysis";
import { syncPendingReport } from "@/lib/report-automation";

async function getAutomationActor(): Promise<AccessUser> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    include: { clients: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!admin?.email) {
    throw new Error("No admin user is available for automation tasks");
  }

  return {
    id: admin.id,
    email: admin.email,
    role: "ADMIN",
    clientIds: admin.clients.map((client) => client.id),
  };
}

export async function runAutomationCycle() {
  const run = await prisma.automationRun.create({
    data: {
      type: "SYSTEM_AUTOMATION",
      status: "RUNNING",
    },
  });

  const summary = {
    pendingReportsPolled: 0,
    reportsCompleted: 0,
    reportsAnalyzed: 0,
    lettersGenerated: 0,
    followUpsFlagged: 0,
    failures: 0,
  };

  try {
    const actor = await getAutomationActor();

    const pendingReports = await prisma.creditReport.findMany({
      where: { providerStatus: { in: ["PENDING", "REQUESTED"] }, providerReportId: { not: null } },
      orderBy: { createdAt: "asc" },
      take: 25,
    });

    for (const report of pendingReports) {
      summary.pendingReportsPolled += 1;
      try {
        const result = await syncPendingReport(report.id);
        if (result.status === "COMPLETED") {
          summary.reportsCompleted += 1;
        }
      } catch (error) {
        summary.failures += 1;
        console.error("Pending report poll failed", report.id, error);
      }
    }

    const reportsToAnalyze = await prisma.creditReport.findMany({
      where: {
        analyzedAt: null,
        rawData: { not: null },
        providerStatus: { in: ["COMPLETED", "UPLOADED"] },
      },
      orderBy: { createdAt: "asc" },
      take: 25,
    });

    for (const report of reportsToAnalyze) {
      try {
        const result = await analyzeCreditReport({ reportId: report.id, actor });
        if (!result.reusedExisting) {
          summary.reportsAnalyzed += 1;
        }
      } catch (error) {
        summary.failures += 1;
        console.error("Report analysis automation failed", report.id, error);
      }
    }

    const disputesNeedingLetters = await prisma.disputeItem.findMany({
      where: {
        status: "TO_DISPUTE",
        confidenceScore: { gte: 60 },
        letters: { none: {} },
      },
      include: { letters: true },
      take: 25,
      orderBy: { createdAt: "asc" },
    });

    for (const dispute of disputesNeedingLetters) {
      try {
        await generateDisputeLetter(dispute.id);
        await prisma.disputeItem.update({
          where: { id: dispute.id },
          data: {
            status: "DRAFTING",
            lastAutomatedActionAt: new Date(),
            followUpAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
        summary.lettersGenerated += 1;
      } catch (error) {
        summary.failures += 1;
        console.error("Automatic letter generation failed", dispute.id, error);
      }
    }

    const now = new Date();
    const followUps = await prisma.disputeItem.findMany({
      where: {
        status: { in: ["DRAFTING", "SENT", "IN_PROGRESS"] },
        followUpAt: { lte: now },
      },
      take: 25,
    });

    for (const dispute of followUps) {
      await prisma.$transaction(async (tx) => {
        await tx.activityLog.create({
          data: {
            clientId: dispute.clientId,
            action: "DISPUTE_FOLLOW_UP_DUE",
            details: `Automated follow-up reminder for dispute ${dispute.id} (${dispute.type}).`,
          },
        });
        await tx.disputeItem.update({
          where: { id: dispute.id },
          data: {
            status: dispute.status === "SENT" ? "IN_PROGRESS" : dispute.status,
            lastAutomatedActionAt: now,
            followUpAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      });
      summary.followUpsFlagged += 1;
    }

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: summary.failures ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        summary: `Polled ${summary.pendingReportsPolled} pending reports, analyzed ${summary.reportsAnalyzed} reports, generated ${summary.lettersGenerated} letters, flagged ${summary.followUpsFlagged} follow-ups.`,
        details: JSON.stringify(summary),
        completedAt: new Date(),
      },
    });

    return summary;
  } catch (error) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        summary: error instanceof Error ? error.message : "Automation run failed",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

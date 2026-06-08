import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { analyzeCreditReport } from "@/lib/report-analysis";
import { applyProviderWebhookUpdate } from "@/lib/report-automation";
import { prisma } from "@/lib/prisma";

function validateWebhookSecret(request: NextRequest) {
  const configured = process.env.REPORT_PROVIDER_WEBHOOK_SECRET;
  if (!configured) return true;

  const incoming =
    request.headers.get("x-report-provider-secret") ||
    request.headers.get("x-webhook-secret") ||
    request.nextUrl.searchParams.get("secret");

  return incoming === configured;
}

export async function POST(request: NextRequest) {
  try {
    if (!validateWebhookSecret(request)) {
      return NextResponse.json({ error: "Invalid provider webhook secret" }, { status: 401 });
    }

    const body = (await request.json()) as {
      provider?: string;
      providerReportId?: string;
      bureau?: string | null;
      score?: number | null;
      rawData?: string | null;
      fileUrl?: string | null;
      status?: "completed" | "pending" | "failed";
      reason?: string;
    };

    if (!body.providerReportId || !body.status) {
      return NextResponse.json({ error: "providerReportId and status are required" }, { status: 400 });
    }

    const report = await applyProviderWebhookUpdate({
      provider: body.provider || "generic",
      providerReportId: body.providerReportId,
      bureau: body.bureau,
      score: body.score,
      rawData: body.rawData,
      fileUrl: body.fileUrl,
      status: body.status,
      reason: body.reason,
    });

    let analysis = null;
    if (body.status === "completed" && process.env.AUTO_ANALYZE_PULLED_REPORTS === "true") {
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        include: { clients: { select: { id: true } } },
        orderBy: { createdAt: "asc" },
      });

      if (admin?.email) {
        analysis = await analyzeCreditReport({
          reportId: report.id,
          actor: {
            id: admin.id,
            email: admin.email,
            role: "ADMIN",
            clientIds: admin.clients.map((client) => client.id),
          },
        });
      }
    }

    return NextResponse.json({ success: true, reportId: report.id, analysis });
  } catch (error: unknown) {
    console.error("Provider webhook error:", error);
    const message = getErrorMessage(error, "Failed to process provider webhook");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

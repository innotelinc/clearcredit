import { NextRequest, NextResponse } from "next/server";
import {
  assertCanAccessClient,
  isAdmin,
  requireRequestUser,
} from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { analyzeCreditReport } from "@/lib/report-analysis";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = await request.json();
    const { rawData, bureau, score, clientId, autoAnalyze } = body as {
      rawData?: string;
      bureau?: string;
      score?: number | string;
      clientId?: string;
      autoAnalyze?: boolean;
    };

    if (!rawData || rawData.length < 50) {
      return NextResponse.json({ error: "Credit report data is too short or missing" }, { status: 400 });
    }
    if (rawData.length > 50000) {
      return NextResponse.json({ error: "Credit report data exceeds maximum length of 50,000 characters" }, { status: 400 });
    }

    const targetClientId = clientId || user.clientIds[0];
    if (!targetClientId) {
      return NextResponse.json({ error: "No client profile found" }, { status: 400 });
    }

    if (!isAdmin(user)) {
      assertCanAccessClient(user, targetClientId);
    }

    const client = await prisma.client.findUnique({ where: { id: targetClientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const report = await prisma.creditReport.create({
      data: {
        clientId: targetClientId,
        rawData,
        bureau: bureau || "Combined",
        score: score ? Number.parseInt(String(score), 10) : undefined,
        source: "MANUAL",
        providerStatus: "UPLOADED",
      },
    });

    await prisma.activityLog.create({
      data: {
        clientId: targetClientId,
        action: "REPORT_UPLOADED",
        details: `Credit report uploaded from ${report.bureau || "Combined"}`,
      },
    });

    if (autoAnalyze) {
      const analysis = await analyzeCreditReport({ reportId: report.id, actor: user });
      return NextResponse.json({ report, analysis }, { status: 201 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error: unknown) {
    console.error("Upload report error:", error);
    const message = getErrorMessage(error, "Failed to upload report");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const clientId = request.nextUrl.searchParams.get("clientId") || user.clientIds[0];

    if (!clientId) {
      return NextResponse.json({ reports: [] });
    }

    if (!isAdmin(user)) {
      assertCanAccessClient(user, clientId);
    }

    const reports = await prisma.creditReport.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reports });
  } catch (error: unknown) {
    console.error("Get reports error:", error);
    const message = getErrorMessage(error, "Failed to fetch reports");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

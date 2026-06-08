import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRequestUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = await request.json();
    const { rawData, bureau, score } = body;

    if (!rawData || rawData.length < 50) {
      return NextResponse.json({ error: "Credit report data is too short or missing" }, { status: 400 });
    }

    if (rawData.length > 50000) {
      return NextResponse.json({ error: "Credit report data exceeds maximum length of 50,000 characters" }, { status: 400 });
    }

    const client = await prisma.client.findFirst({ where: { userId: user.id } });
    if (!client) {
      return NextResponse.json({ error: "No client profile found" }, { status: 400 });
    }

    const report = await prisma.creditReport.create({
      data: {
        clientId: client.id,
        rawData,
        bureau: bureau || "Combined",
        score: score ? Number.parseInt(String(score), 10) : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        clientId: client.id,
        action: "REPORT_UPLOADED",
        details: `Credit report uploaded from ${report.bureau}`,
      },
    });

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
    const client = await prisma.client.findFirst({
      where: { userId: user.id },
      include: { creditReports: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ reports: client?.creditReports || [] });
  } catch (error: unknown) {
    console.error("Get reports error:", error);
    const message = getErrorMessage(error, "Failed to fetch reports");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

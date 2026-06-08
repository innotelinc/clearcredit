import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { rawData, bureau, score } = body;

    if (!rawData || rawData.length < 50) {
      return NextResponse.json({ error: "Credit report data is too short or missing" }, { status: 400 });
    }

    if (rawData.length > 50000) {
      return NextResponse.json({ error: "Credit report data exceeds maximum length of 50,000 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
      include: { clients: true },
    });

    if (!user?.clients?.length) {
      return NextResponse.json({ error: "No client profile found" }, { status: 400 });
    }

    const client = user.clients[0];

    const report = await prisma.creditReport.create({
      data: {
        clientId: client.id,
        rawData,
        bureau: bureau || "Combined",
        score: score ? parseInt(score) : undefined,
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
  } catch (error: any) {
    console.error("Upload report error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload report" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
      include: { clients: { include: { creditReports: { orderBy: { createdAt: "desc" } } } } },
    });

    if (!user?.clients?.length) {
      return NextResponse.json({ reports: [] });
    }

    const reports = user.clients[0].creditReports;
    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error("Get reports error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch reports" }, { status: 500 });
  }
}

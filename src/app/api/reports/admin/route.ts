import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);

    const reports = await prisma.creditReport.findMany({
      include: { client: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reports });
  } catch (error: unknown) {
    console.error("Get admin reports error:", error);
    const message = getErrorMessage(error, "Failed to fetch reports");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

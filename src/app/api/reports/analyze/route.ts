import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { analyzeCreditReport } from "@/lib/report-analysis";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = (await request.json()) as { reportId?: string; force?: boolean };

    if (!body.reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const analysis = await analyzeCreditReport({
      reportId: body.reportId,
      actor: user,
      force: body.force ?? false,
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error: unknown) {
    console.error("Analyze report error:", error);
    const message = getErrorMessage(error, "Failed to analyze report");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  assertCanAccessClient,
  requireRequestUser,
} from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { attemptAutomaticReportPull } from "@/lib/report-automation";
import { analyzeCreditReport } from "@/lib/report-analysis";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = (await request.json().catch(() => ({}))) as {
      clientId?: string;
      autoAnalyze?: boolean;
    };

    const clientId = body.clientId || user.clientIds[0];
    if (!clientId) {
      return NextResponse.json({ error: "No client profile found" }, { status: 400 });
    }

    assertCanAccessClient(user, clientId);

    const result = await attemptAutomaticReportPull(clientId);
    if (result.status !== "created" || !result.reportId) {
      return NextResponse.json(result, { status: 200 });
    }

    let analysis = null;
    if (body.autoAnalyze || process.env.AUTO_ANALYZE_PULLED_REPORTS === "true") {
      analysis = await analyzeCreditReport({ reportId: result.reportId, actor: user });
    }

    return NextResponse.json({ ...result, analysis }, { status: 201 });
  } catch (error: unknown) {
    console.error("Automatic report pull error:", error);
    const message = getErrorMessage(error, "Failed to pull credit report");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

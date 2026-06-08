import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { runAutomationCycle } from "@/lib/automation-runner";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const summary = await runAutomationCycle();
    return NextResponse.json({ success: true, summary });
  } catch (error: unknown) {
    console.error("Automation run failed:", error);
    const message = getErrorMessage(error, "Failed to run automation");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

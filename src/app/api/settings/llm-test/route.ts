import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { testLlmBackend } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const result = await testLlmBackend();
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    console.error("LLM test error:", error);
    const message = getErrorMessage(error, "Failed to test LLM backend");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

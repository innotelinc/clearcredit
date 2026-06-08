import { NextRequest, NextResponse } from "next/server";
import { generateDisputeLetter } from "@/lib/ai-letter";
import { prisma } from "@/lib/prisma";
import { assertCanAccessDispute, requireRequestUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);

    const body = await request.json();
    const { disputeItemId } = body;

    if (!disputeItemId) {
      return NextResponse.json({ error: "Dispute item ID is required" }, { status: 400 });
    }

    const dispute = await prisma.disputeItem.findUnique({
      where: { id: disputeItemId },
      select: { id: true, clientId: true },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    assertCanAccessDispute(user, dispute.clientId);

    const { letter } = await generateDisputeLetter(disputeItemId);
    return NextResponse.json({ letter }, { status: 201 });
  } catch (error: unknown) {
    console.error("AI letter generation error:", error);
    const message = getErrorMessage(error, "Failed to generate letter");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

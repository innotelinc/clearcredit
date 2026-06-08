import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdminUser(request);

    const body = await request.json();
    const { amount, reason } = body;

    if (!Number.isInteger(amount) || amount === 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        disputeCredits: { increment: amount },
      },
    });

    await prisma.activityLog.create({
      data: {
        clientId: id,
        action: amount > 0 ? "CREDITS_ADDED" : "CREDITS_REMOVED",
        details: `${Math.abs(amount)} credits ${amount > 0 ? "added" : "removed"} by admin${reason ? `: ${reason}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      disputeCredits: updated.disputeCredits,
      message: `${Math.abs(amount)} credits ${amount > 0 ? "added" : "removed"}`,
    });
  } catch (error: unknown) {
    console.error("Admin credits error:", error);
    const message = getErrorMessage(error, "Failed to update credits");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

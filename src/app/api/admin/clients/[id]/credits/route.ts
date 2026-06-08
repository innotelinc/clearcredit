import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { recordCreditChange } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdminUser(request);

    const body = (await request.json()) as { amount?: number; reason?: string };
    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount === 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    let updatedCredits = client.disputeCredits;

    await prisma.$transaction(async (tx) => {
      const updatedClient = await recordCreditChange({
        tx,
        clientId: id,
        amount: Math.abs(amount),
        type: amount > 0 ? "credit" : "debit",
        source: "ADMIN_ADJUSTMENT",
        description: body.reason || "Admin credit adjustment",
      });
      updatedCredits = updatedClient.disputeCredits;

      await tx.activityLog.create({
        data: {
          clientId: id,
          action: amount > 0 ? "CREDITS_ADDED" : "CREDITS_REMOVED",
          details: `${Math.abs(amount)} credits ${amount > 0 ? "added" : "removed"} by admin${body.reason ? `: ${body.reason}` : ""}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      disputeCredits: updatedCredits,
      message: `${Math.abs(amount)} credits ${amount > 0 ? "added" : "removed"}`,
    });
  } catch (error: unknown) {
    console.error("Admin credits error:", error);
    const message = getErrorMessage(error, "Failed to update credits");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

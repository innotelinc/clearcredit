import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: token.email } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
  } catch (error: any) {
    console.error("Admin credits error:", error);
    return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
  }
}

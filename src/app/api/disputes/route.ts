import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
      include: { clients: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN";
    const clientIds = user.clients.map((c) => c.id);

    const disputes = await prisma.disputeItem.findMany({
      where: isAdmin ? undefined : { clientId: { in: clientIds } },
      include: { client: { select: { id: true, name: true, email: true } }, report: { select: { id: true, bureau: true } }, letters: { select: { id: true, templateType: true, generatedAt: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(disputes);
  } catch (error) {
    console.error("Get disputes error:", error);
    return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, clientId, bureau, type, description, creditor, accountNumber, amount, dateReported } = body;

    const user = await prisma.user.findUnique({
      where: { email: token.email },
      include: { clients: { select: { id: true } } },
    });

    const isAdmin = user?.role === "ADMIN";
    const ownsClient = user?.clients.some((c) => c.id === clientId) ?? false;

    if (!isAdmin && !ownsClient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.disputeCredits <= 0) {
      return NextResponse.json({ error: "Client has no remaining dispute credits" }, { status: 403 });
    }

    const dispute = await prisma.disputeItem.create({
      data: {
        reportId,
        clientId,
        bureau,
        type,
        description,
        creditor,
        accountNumber,
        amount,
        dateReported: dateReported ? new Date(dateReported) : undefined,
      },
      include: { client: { select: { id: true, name: true, email: true } } },
    });

    const newCredits = Math.max(0, client.disputeCredits - 1);
    await prisma.client.update({
      where: { id: clientId },
      data: { disputeCredits: newCredits },
    });

    // Low-credit email alert
    if (newCredits <= 2 && newCredits > 0) {
      const { sendLowCreditAlert } = await import("@/lib/email");
      await sendLowCreditAlert(client.email, client.name, newCredits).catch(() => {});
    }

    await prisma.activityLog.create({
      data: { clientId, action: "DISPUTE_CREATED", details: `Dispute created: ${type}` },
    });

    return NextResponse.json({ ...dispute, remainingCredits: newCredits }, { status: 201 });
  } catch (error) {
    console.error("Create dispute error:", error);
    return NextResponse.json({ error: "Failed to create dispute" }, { status: 500 });
  }
}

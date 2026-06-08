import { NextRequest, NextResponse } from "next/server";
import {
  assertCanAccessClient,
  isAdmin,
  requireRequestUser,
} from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { recordCreditChange } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);

    const disputes = await prisma.disputeItem.findMany({
      where: isAdmin(user) ? undefined : { clientId: { in: user.clientIds } },
      include: {
        client: { select: { id: true, name: true, email: true } },
        report: { select: { id: true, bureau: true } },
        letters: { select: { id: true, templateType: true, generatedAt: true, content: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(disputes);
  } catch (error: unknown) {
    console.error("Get disputes error:", error);
    const message = getErrorMessage(error, "Failed to fetch disputes");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = (await request.json()) as {
      reportId?: string;
      clientId?: string;
      bureau?: string;
      type?: string;
      description?: string;
      creditor?: string | null;
      accountNumber?: string | null;
      amount?: string | null;
      dateReported?: string | null;
    };

    if (!body.clientId || !body.reportId || !body.type || !body.description || !body.bureau) {
      return NextResponse.json({ error: "Client, report, bureau, type, and description are required" }, { status: 400 });
    }

    assertCanAccessClient(user, body.clientId);

    const client = await prisma.client.findUnique({ where: { id: body.clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (client.disputeCredits <= 0) {
      return NextResponse.json({ error: "Client has no remaining dispute credits" }, { status: 403 });
    }

    const report = await prisma.creditReport.findUnique({ where: { id: body.reportId } });
    if (!report || report.clientId !== body.clientId) {
      return NextResponse.json({ error: "Credit report not found for client" }, { status: 404 });
    }

    let disputeId = "";
    let remainingCredits = client.disputeCredits;

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.disputeItem.create({
        data: {
          reportId: body.reportId!,
          clientId: body.clientId!,
          bureau: body.bureau!,
          type: body.type!,
          description: body.description!,
          creditor: body.creditor || null,
          accountNumber: body.accountNumber || null,
          amount: body.amount || null,
          dateReported: body.dateReported ? new Date(body.dateReported) : undefined,
        },
        include: { client: { select: { id: true, name: true, email: true } } },
      });

      disputeId = created.id;

      const updatedClient = await recordCreditChange({
        tx,
        clientId: body.clientId!,
        amount: 1,
        type: "debit",
        source: "MANUAL_DISPUTE",
        description: `Manual dispute created: ${body.type}`,
      });
      remainingCredits = updatedClient.disputeCredits;

      await tx.activityLog.create({
        data: {
          clientId: body.clientId!,
          action: "DISPUTE_CREATED",
          details: `Dispute created: ${body.type}`,
        },
      });

      return created;
    });

    if (remainingCredits <= 2 && remainingCredits > 0) {
      const { sendLowCreditAlert } = await import("@/lib/email");
      await sendLowCreditAlert(client.email, client.name, remainingCredits).catch(() => undefined);
    }

    return NextResponse.json({ ...dispute, disputeId, remainingCredits }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create dispute error:", error);
    const message = getErrorMessage(error, "Failed to create dispute");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

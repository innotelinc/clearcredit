import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser(request);

    const body = await request.json();
    const { bureau, type, description, creditor, accountNumber, amount, dateReported, status, notes } = body;
    const dispute = await prisma.disputeItem.update({
      where: { id },
      data: {
        bureau,
        type,
        description,
        creditor,
        accountNumber,
        amount,
        dateReported: dateReported ? new Date(dateReported) : undefined,
        status,
        notes,
      },
      include: { client: { select: { id: true, name: true, email: true } }, letters: true },
    });
    return NextResponse.json(dispute);
  } catch (error: unknown) {
    console.error("Update dispute error:", error);
    const message = getErrorMessage(error, "Failed to update dispute");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser(request);

    await prisma.disputeItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete dispute error:", error);
    const message = getErrorMessage(error, "Failed to delete dispute");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

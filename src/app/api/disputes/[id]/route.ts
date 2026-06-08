import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { bureau, type, description, creditor, accountNumber, amount, dateReported, status, notes } = body;
    const dispute = await prisma.disputeItem.update({
      where: { id },
      data: { bureau, type, description, creditor, accountNumber, amount, dateReported, status, notes },
      include: { client: { select: { id: true, name: true, email: true } }, letters: true },
    });
    return NextResponse.json(dispute);
  } catch (error) {
    console.error("Update dispute error:", error);
    return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.disputeItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete dispute error:", error);
    return NextResponse.json({ error: "Failed to delete dispute" }, { status: 500 });
  }
}

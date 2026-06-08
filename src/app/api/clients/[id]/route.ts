import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser(request);

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        disputes: { orderBy: { createdAt: "desc" } },
        contracts: { orderBy: { createdAt: "desc" } },
        creditReports: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: unknown) {
    console.error("Get client error:", error);
    const message = getErrorMessage(error, "Failed to fetch client");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser(request);

    const body = await request.json();
    const { name, email, phone, address, city, state, zip, creditScore, status, subscriptionStatus } = body;
    const client = await prisma.client.update({
      where: { id },
      data: { name, email, phone, address, city, state, zip, creditScore, status, subscriptionStatus },
    });
    return NextResponse.json(client);
  } catch (error: unknown) {
    console.error("Update client error:", error);
    const message = getErrorMessage(error, "Failed to update client");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser(request);

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete client error:", error);
    const message = getErrorMessage(error, "Failed to delete client");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

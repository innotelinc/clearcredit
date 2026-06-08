import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);

    const contracts = await prisma.serviceContract.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contracts);
  } catch (error: unknown) {
    console.error("Get contracts error:", error);
    const message = getErrorMessage(error, "Failed to fetch contracts");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request);

    const body = await request.json();
    const { clientId, title, content, services, monthlyFee, startDate, endDate, signedAt, signatureData, status } = body;

    const contract = await prisma.serviceContract.create({
      data: {
        clientId,
        title,
        content,
        services,
        monthlyFee: monthlyFee ? Number(monthlyFee) : 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        signedAt: signedAt ? new Date(signedAt) : undefined,
        signatureData: signatureData || undefined,
        status: status || "pending",
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: { clientId, action: "CONTRACT_CREATED", details: `Contract ${title} created` },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error: unknown) {
    console.error("Create contract error:", error);
    const message = getErrorMessage(error, "Failed to create contract");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

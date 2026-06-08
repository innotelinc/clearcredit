import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contracts = await prisma.serviceContract.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Get contracts error:", error);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, title, content, services, monthlyFee, startDate, endDate } = body;

    const contract = await prisma.serviceContract.create({
      data: {
        clientId,
        title,
        content,
        services,
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: { client: true },
    });

    await prisma.activityLog.create({
      data: { clientId, action: "CONTRACT_CREATED", details: `Contract ${title} created` },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("Create contract error:", error);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}

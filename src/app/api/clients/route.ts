import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);

    const clients = await prisma.client.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { disputes: true, creditReports: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error: unknown) {
    console.error("Get clients error:", error);
    const message = getErrorMessage(error, "Failed to fetch clients");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request);

    const body = await request.json();
    const { name, email, phone, address, city, state, zip, ssn, dateOfBirth, password, businessId } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    let userId: string | undefined;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role: "CLIENT" },
      });
      userId = user.id;
    }

    let business = businessId
      ? await prisma.business.findUnique({ where: { id: businessId } })
      : await prisma.business.findFirst();

    if (!business) {
      business = await prisma.business.create({
        data: { name: "ClearCredit Default", plan: "PROFESSIONAL" },
      });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        ssn,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        userId,
        businessId: business.id,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await prisma.activityLog.create({
      data: { clientId: client.id, action: "CLIENT_CREATED", details: `Client ${name} created` },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: unknown) {
    console.error("Create client error:", error);
    const message = getErrorMessage(error, "Failed to create client");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

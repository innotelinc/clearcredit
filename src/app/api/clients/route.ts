import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { disputes: true, creditReports: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Get clients error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const finalBusinessId = business.id;

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
        businessId: finalBusinessId,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await prisma.activityLog.create({
      data: { clientId: client.id, action: "CLIENT_CREATED", details: `Client ${name} created` },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}

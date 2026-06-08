import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sanitizeSignupRole } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

const DEFAULT_BUSINESS_NAME = "ClearCredit Default";
const DEFAULT_BUSINESS_PLAN = "PROFESSIONAL";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      phone,
      address,
      city,
      state,
      zip,
      ssn,
      dateOfBirth,
      contractTitle,
      contractContent,
      contractServices,
      monthlyFee,
      signedAt,
      signatureData,
      contractStatus,
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const role = sanitizeSignupRole(body.role);

    let business = await prisma.business.findFirst();
    if (!business) {
      business = await prisma.business.create({
        data: { name: DEFAULT_BUSINESS_NAME, plan: DEFAULT_BUSINESS_PLAN },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          businessId: business.id,
        },
      });

      const client = await tx.client.create({
        data: {
          businessId: business.id,
          userId: user.id,
          name,
          email,
          phone,
          address,
          city,
          state,
          zip,
          ssn,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        },
      });

      if (contractTitle && contractContent && contractServices) {
        await tx.serviceContract.create({
          data: {
            clientId: client.id,
            title: contractTitle,
            content: contractContent,
            services: contractServices,
            monthlyFee: monthlyFee ? Number(monthlyFee) : 0,
            startDate: new Date(),
            signedAt: signedAt ? new Date(signedAt) : undefined,
            signatureData: signatureData || undefined,
            status: contractStatus || "signed",
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          clientId: client.id,
          action: "CLIENT_SIGNUP",
          details: `Client account created for ${email}`,
        },
      });

      return { user, client };
    });

    return NextResponse.json({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      clientId: result.client.id,
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Registration failed") }, { status: 500 });
  }
}

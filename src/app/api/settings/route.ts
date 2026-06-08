import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

async function getAdminBusiness(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { business: true },
  });

  if (user?.business) {
    return user.business;
  }

  return prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser(request);
    const business = await getAdminBusiness(admin.id);

    if (!business) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    return NextResponse.json({
      business,
      integrations: {
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
        webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
        resendConfigured: Boolean(process.env.RESEND_API_KEY),
      },
      automation: {
        reportPullMode: process.env.REPORT_PULL_MODE || "disabled",
        autoAnalyzePulledReports: process.env.AUTO_ANALYZE_PULLED_REPORTS === "true",
      },
    });
  } catch (error: unknown) {
    console.error("Get settings error:", error);
    const message = getErrorMessage(error, "Failed to fetch settings");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdminUser(request);
    const business = await getAdminBusiness(admin.id);

    if (!business) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      address?: string | null;
      phone?: string | null;
      plan?: string;
    };

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: body.name?.trim() || business.name,
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        plan: body.plan?.trim() || business.plan,
      },
    });

    return NextResponse.json({ business: updated });
  } catch (error: unknown) {
    console.error("Update settings error:", error);
    const message = getErrorMessage(error, "Failed to update settings");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

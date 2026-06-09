import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { getLlmStatus } from "@/lib/llm";
import { formatUsdFromCents, getPricingPlans, updatePricingPlans } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getReportProviderMode, isRealProviderConfigured } from "@/lib/report-provider";
import { buildPublicUrl } from "@/lib/url";

async function getAdminBusiness(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { business: true },
  });

  if (user?.business) return user.business;
  return prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
}

async function getProxyStatus() {
  const llmStatus = getLlmStatus();
  if (!llmStatus.usingLocalProxy || !llmStatus.baseURL) {
    return {
      enabled: false,
      reachable: false,
      statusText: "Local proxy mode is not active",
      healthUrl: null as string | null,
    };
  }

  const healthUrl = llmStatus.baseURL.replace(/\/v1\/?$/, "") + "/";

  try {
    const response = await fetch(healthUrl, { cache: "no-store" });
    const text = await response.text();
    return {
      enabled: true,
      reachable: response.ok,
      statusText: response.ok ? text.slice(0, 120) || "Proxy reachable" : `Proxy responded with HTTP ${response.status}`,
      healthUrl,
    };
  } catch (error) {
    return {
      enabled: true,
      reachable: false,
      statusText: getErrorMessage(error, "Proxy health check failed"),
      healthUrl,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser(request);
    const business = await getAdminBusiness(admin.id);
    if (!business) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const llmStatus = getLlmStatus();
    const [lastAutomationRun, proxyStatus, pricingPlans] = await Promise.all([
      prisma.automationRun.findFirst({ orderBy: { startedAt: "desc" } }),
      getProxyStatus(),
      getPricingPlans(),
    ]);

    return NextResponse.json({
      business,
      integrations: {
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
        webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        llmConfigured: llmStatus.configured,
        llmBackend: llmStatus.backend,
        llmDisplayName: llmStatus.displayName,
        llmBaseUrl: llmStatus.baseURL,
        llmAnalysisModel: llmStatus.analysisModel,
        llmLetterModel: llmStatus.letterModel,
        usingLocalProxy: llmStatus.usingLocalProxy,
        proxyStatus,
        resendConfigured: Boolean(process.env.RESEND_API_KEY),
        reportProviderConfigured: isRealProviderConfigured(),
      },
      pricing: {
        monthlyPlans: pricingPlans.filter((plan) => plan.interval === "month").map((plan) => ({
          key: plan.key,
          name: plan.name,
          amountCents: plan.amountCents,
          displayPrice: `${formatUsdFromCents(plan.amountCents)}/mo`,
          disputes: plan.disputes,
        })),
        yearlyPlans: pricingPlans.filter((plan) => plan.interval === "year").map((plan) => ({
          key: plan.key,
          name: plan.name,
          amountCents: plan.amountCents,
          displayPrice: `${formatUsdFromCents(plan.amountCents)}/yr`,
          disputes: plan.disputes,
        })),
      },
      automation: {
        reportPullMode: getReportProviderMode(),
        autoAnalyzePulledReports: process.env.AUTO_ANALYZE_PULLED_REPORTS === "true",
        providerBaseUrl: process.env.REPORT_PROVIDER_BASE_URL || null,
        callbackUrl: buildPublicUrl("/api/reports/provider-webhook", request),
        lastRun: lastAutomationRun,
      },
    });
  } catch (error: unknown) {
    console.error("Get settings error:", error);
    const message = getErrorMessage(error, "Failed to fetch settings");
    const status = error instanceof Error && "status" in error ? Number((error as { status?: number }).status) : 500;
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
      pricing?: Array<{ key: string; amountCents: number }>;
    };

    const [updatedBusiness, updatedPricingPlans] = await Promise.all([
      prisma.business.update({
        where: { id: business.id },
        data: {
          name: body.name?.trim() || business.name,
          address: body.address?.trim() || null,
          phone: body.phone?.trim() || null,
          plan: body.plan?.trim() || business.plan,
        },
      }),
      body.pricing?.length ? updatePricingPlans(body.pricing) : getPricingPlans(),
    ]);

    return NextResponse.json({
      business: updatedBusiness,
      pricing: {
        monthlyPlans: updatedPricingPlans.filter((plan) => plan.interval === "month").map((plan) => ({
          key: plan.key,
          name: plan.name,
          amountCents: plan.amountCents,
          displayPrice: `${formatUsdFromCents(plan.amountCents)}/mo`,
          disputes: plan.disputes,
        })),
        yearlyPlans: updatedPricingPlans.filter((plan) => plan.interval === "year").map((plan) => ({
          key: plan.key,
          name: plan.name,
          amountCents: plan.amountCents,
          displayPrice: `${formatUsdFromCents(plan.amountCents)}/yr`,
          disputes: plan.disputes,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("Update settings error:", error);
    const message = getErrorMessage(error, "Failed to update settings");
    const status = error instanceof Error && "status" in error ? Number((error as { status?: number }).status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

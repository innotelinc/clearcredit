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
    return { enabled: false, reachable: false, statusText: "Local proxy mode is not active", healthUrl: null as string | null };
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

function serializePricingPlans(plans: Awaited<ReturnType<typeof getPricingPlans>>) {
  const serialize = (plan: Awaited<ReturnType<typeof getPricingPlans>>[number]) => ({
    key: plan.key,
    kind: plan.kind,
    name: plan.name,
    interval: plan.interval,
    amountCents: plan.amountCents,
    displayPrice: `${formatUsdFromCents(plan.amountCents)}${plan.interval === "month" ? "/mo" : plan.interval === "year" ? "/yr" : ""}`,
    disputes: plan.disputes,
    stripePriceId: plan.stripePriceId,
    sortOrder: plan.sortOrder,
    active: plan.active,
  });

  return {
    plans: plans.map(serialize),
    packages: plans.filter((plan) => plan.kind === "package").map(serialize),
    monthlyPlans: plans.filter((plan) => plan.kind === "subscription" && plan.interval === "month").map(serialize),
    yearlyPlans: plans.filter((plan) => plan.kind === "subscription" && plan.interval === "year").map(serialize),
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser(request);
    const business = await getAdminBusiness(admin.id);
    if (!business) return NextResponse.json({ error: "No business found" }, { status: 404 });

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
      pricing: serializePricingPlans(pricingPlans),
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
    if (!business) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = (await request.json()) as {
      name?: string;
      address?: string | null;
      phone?: string | null;
      plan?: string;
      pricing?: Array<{ key: string; name: string; amountCents: number; disputes: number; stripePriceId: string | null; sortOrder: number; active: boolean }>;
    };

    if (body.pricing?.some((plan) => !plan.name?.trim() || !Number.isFinite(plan.amountCents) || plan.amountCents <= 0 || !Number.isFinite(plan.disputes) || plan.disputes <= 0 || !Number.isFinite(plan.sortOrder))) {
      return NextResponse.json({ error: "Each pricing plan must include a name, positive amount, positive dispute count, and numeric sort order." }, { status: 400 });
    }

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

    return NextResponse.json({ business: updatedBusiness, pricing: serializePricingPlans(updatedPricingPlans) });
  } catch (error: unknown) {
    console.error("Update settings error:", error);
    const message = getErrorMessage(error, "Failed to update settings");
    const status = error instanceof Error && "status" in error ? Number((error as { status?: number }).status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

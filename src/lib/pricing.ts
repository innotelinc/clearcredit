import { prisma } from "@/lib/prisma";

export type PricingKind = "package" | "subscription";
export type PricingInterval = "month" | "year";
export type PackageKey = "basic" | "standard" | "premium";
export type SubscriptionPlanKey =
  | "basic_monthly"
  | "standard_monthly"
  | "premium_monthly"
  | "basic_yearly"
  | "standard_yearly"
  | "premium_yearly";
export type PricingKey = PackageKey | SubscriptionPlanKey;

export interface PricingPlanRecord {
  key: PricingKey;
  kind: PricingKind;
  name: string;
  interval: PricingInterval | null;
  amountCents: number;
  disputes: number;
  stripePriceId: string | null;
  sortOrder: number;
  active: boolean;
}

export interface PricingPlanUpdateInput {
  key: string;
  name: string;
  amountCents: number;
  disputes: number;
  stripePriceId: string | null;
  sortOrder: number;
  active: boolean;
}

const DEFAULT_PRICING_PLANS: PricingPlanRecord[] = [
  { key: "basic", kind: "package", name: "Basic", interval: null, amountCents: 14900, disputes: 3, stripePriceId: process.env.STRIPE_BASIC_PRICE_ID || null, sortOrder: 10, active: true },
  { key: "standard", kind: "package", name: "Standard", interval: null, amountCents: 29900, disputes: 7, stripePriceId: process.env.STRIPE_STANDARD_PRICE_ID || null, sortOrder: 20, active: true },
  { key: "premium", kind: "package", name: "Premium", interval: null, amountCents: 49900, disputes: 15, stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || null, sortOrder: 30, active: true },
  { key: "basic_monthly", kind: "subscription", name: "Basic Monthly", interval: "month", amountCents: 4900, disputes: 3, stripePriceId: process.env.STRIPE_BASIC_SUB_PRICE_ID || null, sortOrder: 110, active: true },
  { key: "standard_monthly", kind: "subscription", name: "Standard Monthly", interval: "month", amountCents: 9900, disputes: 7, stripePriceId: process.env.STRIPE_STANDARD_SUB_PRICE_ID || null, sortOrder: 120, active: true },
  { key: "premium_monthly", kind: "subscription", name: "Premium Monthly", interval: "month", amountCents: 14900, disputes: 15, stripePriceId: process.env.STRIPE_PREMIUM_SUB_PRICE_ID || null, sortOrder: 130, active: true },
  { key: "basic_yearly", kind: "subscription", name: "Basic Yearly", interval: "year", amountCents: 49000, disputes: 3, stripePriceId: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || null, sortOrder: 210, active: true },
  { key: "standard_yearly", kind: "subscription", name: "Standard Yearly", interval: "year", amountCents: 99000, disputes: 7, stripePriceId: process.env.STRIPE_STANDARD_YEARLY_PRICE_ID || null, sortOrder: 220, active: true },
  { key: "premium_yearly", kind: "subscription", name: "Premium Yearly", interval: "year", amountCents: 149000, disputes: 15, stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || null, sortOrder: 230, active: true },
];

function normalizePlan(row: {
  key: string;
  kind: string;
  name: string;
  interval: string | null;
  amountCents: number;
  disputes: number;
  stripePriceId: string | null;
  sortOrder: number;
  active: boolean;
}): PricingPlanRecord {
  return {
    key: row.key as PricingKey,
    kind: row.kind as PricingKind,
    name: row.name,
    interval: row.interval as PricingInterval | null,
    amountCents: row.amountCents,
    disputes: row.disputes,
    stripePriceId: row.stripePriceId,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

export function formatUsdFromCents(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amountCents / 100);
}

export async function ensureDefaultPricingPlans() {
  await prisma.$transaction(
    DEFAULT_PRICING_PLANS.map((plan) =>
      prisma.pricingPlan.upsert({
        where: { key: plan.key },
        update: {
          kind: plan.kind,
          interval: plan.interval,
          name: plan.name,
          disputes: plan.disputes,
          stripePriceId: plan.stripePriceId,
          sortOrder: plan.sortOrder,
        },
        create: plan,
      }),
    ),
  );
}

export async function getPricingPlans() {
  await ensureDefaultPricingPlans();
  const rows = await prisma.pricingPlan.findMany({ orderBy: [{ sortOrder: "asc" }, { amountCents: "asc" }] });
  return rows.map(normalizePlan);
}

export async function getActivePricingPlans() {
  const plans = await getPricingPlans();
  return plans.filter((plan) => plan.active);
}

export async function getPackagePlans(activeOnly = true) {
  const plans = activeOnly ? await getActivePricingPlans() : await getPricingPlans();
  return plans.filter((plan) => plan.kind === "package");
}

export async function getSubscriptionPlansByInterval(interval: PricingInterval, activeOnly = true) {
  const plans = activeOnly ? await getActivePricingPlans() : await getPricingPlans();
  return plans.filter((plan) => plan.kind === "subscription" && plan.interval === interval);
}

export async function getSubscriptionPlan(planKey: string) {
  const plans = await getPricingPlans();
  return plans.find((plan) => plan.kind === "subscription" && plan.key === planKey) || null;
}

export async function getDisputePackage(packageKey: string) {
  const plans = await getPricingPlans();
  return plans.find((plan) => plan.kind === "package" && plan.key === packageKey) || null;
}

export async function findSubscriptionPlanByPriceId(priceId?: string | null) {
  if (!priceId) return null;
  const plans = await getPricingPlans();
  return plans.find((plan) => plan.kind === "subscription" && plan.stripePriceId === priceId) || null;
}

export async function findDisputePackageByPriceId(priceId?: string | null) {
  if (!priceId) return null;
  const plans = await getPricingPlans();
  return plans.find((plan) => plan.kind === "package" && plan.stripePriceId === priceId) || null;
}

export async function updatePricingPlans(input: PricingPlanUpdateInput[]) {
  await ensureDefaultPricingPlans();
  await prisma.$transaction(
    input.map((plan) =>
      prisma.pricingPlan.update({
        where: { key: plan.key },
        data: {
          name: plan.name.trim(),
          amountCents: plan.amountCents,
          disputes: plan.disputes,
          stripePriceId: plan.stripePriceId?.trim() || null,
          sortOrder: plan.sortOrder,
          active: plan.active,
        },
      }),
    ),
  );
  return getPricingPlans();
}

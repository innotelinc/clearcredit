import { prisma } from "@/lib/prisma";

export type PricingInterval = "month" | "year";
export type SubscriptionPlanKey =
  | "basic_monthly"
  | "standard_monthly"
  | "premium_monthly"
  | "basic_yearly"
  | "standard_yearly"
  | "premium_yearly";

export interface PricingPlanRecord {
  key: SubscriptionPlanKey;
  name: string;
  interval: PricingInterval;
  amountCents: number;
  disputes: number;
  stripePriceId: string | null;
  active: boolean;
}

const DEFAULT_PRICING_PLANS: PricingPlanRecord[] = [
  { key: "basic_monthly", name: "Basic Monthly", interval: "month", amountCents: 4900, disputes: 3, stripePriceId: process.env.STRIPE_BASIC_SUB_PRICE_ID || null, active: true },
  { key: "standard_monthly", name: "Standard Monthly", interval: "month", amountCents: 9900, disputes: 7, stripePriceId: process.env.STRIPE_STANDARD_SUB_PRICE_ID || null, active: true },
  { key: "premium_monthly", name: "Premium Monthly", interval: "month", amountCents: 14900, disputes: 15, stripePriceId: process.env.STRIPE_PREMIUM_SUB_PRICE_ID || null, active: true },
  { key: "basic_yearly", name: "Basic Yearly", interval: "year", amountCents: 49000, disputes: 3, stripePriceId: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || null, active: true },
  { key: "standard_yearly", name: "Standard Yearly", interval: "year", amountCents: 99000, disputes: 7, stripePriceId: process.env.STRIPE_STANDARD_YEARLY_PRICE_ID || null, active: true },
  { key: "premium_yearly", name: "Premium Yearly", interval: "year", amountCents: 149000, disputes: 15, stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || null, active: true },
];

function normalizePlan(row: {
  key: string;
  name: string;
  interval: string;
  amountCents: number;
  disputes: number;
  stripePriceId: string | null;
  active: boolean;
}): PricingPlanRecord {
  return {
    key: row.key as SubscriptionPlanKey,
    name: row.name,
    interval: row.interval as PricingInterval,
    amountCents: row.amountCents,
    disputes: row.disputes,
    stripePriceId: row.stripePriceId,
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
          name: plan.name,
          interval: plan.interval,
          disputes: plan.disputes,
          stripePriceId: plan.stripePriceId,
          active: plan.active,
        },
        create: plan,
      }),
    ),
  );
}

export async function getPricingPlans() {
  await ensureDefaultPricingPlans();
  const rows = await prisma.pricingPlan.findMany({ orderBy: [{ interval: "asc" }, { amountCents: "asc" }] });
  return rows.map(normalizePlan);
}

export async function getSubscriptionPlansByInterval(interval: PricingInterval) {
  const plans = await getPricingPlans();
  return plans.filter((plan) => plan.interval === interval && plan.active);
}

export async function getSubscriptionPlan(planKey: string) {
  const plans = await getPricingPlans();
  return plans.find((plan) => plan.key === planKey) || null;
}

export async function findSubscriptionPlanByPriceId(priceId?: string | null) {
  if (!priceId) return null;
  const plans = await getPricingPlans();
  return plans.find((plan) => plan.stripePriceId === priceId) || null;
}

export async function updatePricingPlans(input: Array<{ key: string; amountCents: number }>) {
  await ensureDefaultPricingPlans();
  await prisma.$transaction(
    input.map((plan) =>
      prisma.pricingPlan.update({
        where: { key: plan.key },
        data: { amountCents: plan.amountCents },
      }),
    ),
  );
  return getPricingPlans();
}

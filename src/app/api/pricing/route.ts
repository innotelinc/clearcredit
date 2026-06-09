import { NextResponse } from "next/server";
import { formatUsdFromCents, getPackagePlans, getSubscriptionPlansByInterval } from "@/lib/pricing";

type PublicPlan = {
  key: string;
  name: string;
  price: string;
  priceSuffix: string;
  amountCents: number;
  disputes: number;
  active?: boolean;
  sortOrder?: number;
  stripePriceId?: string | null;
};

export async function GET() {
  const [packages, monthlyPlans, yearlyPlans] = await Promise.all([
    getPackagePlans(true),
    getSubscriptionPlansByInterval("month", true),
    getSubscriptionPlansByInterval("year", true),
  ]);

  return NextResponse.json({
    packages: packages.map((plan): PublicPlan => ({
      key: plan.key,
      name: plan.name,
      price: formatUsdFromCents(plan.amountCents),
      priceSuffix: "",
      amountCents: plan.amountCents,
      disputes: plan.disputes,
      active: plan.active,
      sortOrder: plan.sortOrder,
      stripePriceId: plan.stripePriceId,
    })),
    monthlyPlans: monthlyPlans.map((plan): PublicPlan => ({
      key: plan.key,
      name: plan.name,
      price: formatUsdFromCents(plan.amountCents),
      priceSuffix: "/mo",
      amountCents: plan.amountCents,
      disputes: plan.disputes,
      active: plan.active,
      sortOrder: plan.sortOrder,
      stripePriceId: plan.stripePriceId,
    })),
    yearlyPlans: yearlyPlans.map((plan): PublicPlan => ({
      key: plan.key,
      name: plan.name,
      price: formatUsdFromCents(plan.amountCents),
      priceSuffix: "/yr",
      amountCents: plan.amountCents,
      disputes: plan.disputes,
      active: plan.active,
      sortOrder: plan.sortOrder,
      stripePriceId: plan.stripePriceId,
    })),
  });
}

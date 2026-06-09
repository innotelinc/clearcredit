import { NextResponse } from "next/server";
import { formatUsdFromCents, getSubscriptionPlansByInterval } from "@/lib/pricing";

type PublicPlan = {
  key: string;
  name: string;
  price: string;
  priceSuffix: string;
  amountCents: number;
  disputes: number;
};

export async function GET() {
  const [monthlyPlans, yearlyPlans] = await Promise.all([
    getSubscriptionPlansByInterval("month"),
    getSubscriptionPlansByInterval("year"),
  ]);

  return NextResponse.json({
    monthlyPlans: monthlyPlans.map((plan): PublicPlan => ({
      key: plan.key,
      name: plan.name,
      price: formatUsdFromCents(plan.amountCents),
      priceSuffix: "/mo",
      amountCents: plan.amountCents,
      disputes: plan.disputes,
    })),
    yearlyPlans: yearlyPlans.map((plan): PublicPlan => ({
      key: plan.key,
      name: plan.name,
      price: formatUsdFromCents(plan.amountCents),
      priceSuffix: "/yr",
      amountCents: plan.amountCents,
      disputes: plan.disputes,
    })),
  });
}

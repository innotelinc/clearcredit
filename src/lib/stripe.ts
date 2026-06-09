import Stripe from "stripe";
import {
  findDisputePackageByPriceId as findConfiguredDisputePackageByPriceId,
  findSubscriptionPlanByPriceId as findConfiguredSubscriptionPlanByPriceId,
  getDisputePackage as getConfiguredDisputePackage,
  getSubscriptionPlan as getConfiguredSubscriptionPlan,
} from "@/lib/pricing";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

export function isConfiguredStripePriceId(priceId: string) {
  return priceId.startsWith("price_")
    && !["price_basic", "price_standard", "price_premium"].includes(priceId);
}

export async function getDisputePackage(packageKey: string) {
  return getConfiguredDisputePackage(packageKey);
}

export async function getSubscriptionPlan(planKey: string) {
  return getConfiguredSubscriptionPlan(planKey);
}

export async function findDisputePackageByPriceId(priceId?: string | null) {
  return findConfiguredDisputePackageByPriceId(priceId);
}

export async function findSubscriptionPlanByPriceId(priceId?: string | null) {
  return findConfiguredSubscriptionPlanByPriceId(priceId);
}

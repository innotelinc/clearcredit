import Stripe from "stripe";
import { findSubscriptionPlanByPriceId as findConfiguredSubscriptionPlanByPriceId, getSubscriptionPlan as getConfiguredSubscriptionPlan } from "@/lib/pricing";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

export const DISPUTE_PACKAGES: Record<string, { priceId: string; amount: number; name: string; disputes: number }> = {
  basic: {
    priceId: process.env.STRIPE_BASIC_PRICE_ID || "price_basic",
    amount: 14900,
    name: "Basic",
    disputes: 3,
  },
  standard: {
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || "price_standard",
    amount: 29900,
    name: "Standard",
    disputes: 7,
  },
  premium: {
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || "price_premium",
    amount: 49900,
    name: "Premium",
    disputes: 15,
  },
};

export function isConfiguredStripePriceId(priceId: string) {
  return priceId.startsWith("price_")
    && !["price_basic", "price_standard", "price_premium"].includes(priceId);
}

export function getDisputePackage(packageKey: string) {
  return DISPUTE_PACKAGES[packageKey as keyof typeof DISPUTE_PACKAGES] || null;
}

export async function getSubscriptionPlan(planKey: string) {
  return getConfiguredSubscriptionPlan(planKey);
}

export function findDisputePackageByPriceId(priceId?: string | null) {
  if (!priceId) return null;
  return Object.entries(DISPUTE_PACKAGES).find(([, value]) => value.priceId === priceId) || null;
}

export async function findSubscriptionPlanByPriceId(priceId?: string | null) {
  return findConfiguredSubscriptionPlanByPriceId(priceId);
}

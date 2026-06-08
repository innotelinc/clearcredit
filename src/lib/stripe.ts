import Stripe from "stripe";

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

export const SUBSCRIPTION_PLANS: Record<string, { priceId: string; amount: number; name: string; disputes: number }> = {
  basic_monthly: {
    priceId: process.env.STRIPE_BASIC_SUB_PRICE_ID || "price_basic_sub",
    amount: 4900,
    name: "Basic Monthly",
    disputes: 3,
  },
  standard_monthly: {
    priceId: process.env.STRIPE_STANDARD_SUB_PRICE_ID || "price_standard_sub",
    amount: 9900,
    name: "Standard Monthly",
    disputes: 7,
  },
  premium_monthly: {
    priceId: process.env.STRIPE_PREMIUM_SUB_PRICE_ID || "price_premium_sub",
    amount: 14900,
    name: "Premium Monthly",
    disputes: 15,
  },
};

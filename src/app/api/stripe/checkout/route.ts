import { NextResponse } from "next/server";
import { stripe, DISPUTE_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function isValidRedirectUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    const base = new URL(BASE_URL);
    return parsed.hostname === base.hostname && parsed.port === base.port && parsed.protocol === base.protocol;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, package: pkg, plan, clientId, successUrl, cancelUrl } = body;

    if (successUrl && !isValidRedirectUrl(successUrl)) {
      return NextResponse.json({ error: "Invalid success URL" }, { status: 400 });
    }
    if (cancelUrl && !isValidRedirectUrl(cancelUrl)) {
      return NextResponse.json({ error: "Invalid cancel URL" }, { status: 400 });
    }

    const isPackage = pkg && DISPUTE_PACKAGES[pkg];
    const isPlan = plan && SUBSCRIPTION_PLANS[plan];

    if (!email || (!isPackage && !isPlan)) {
      return NextResponse.json({ error: "Invalid package/plan or missing email" }, { status: 400 });
    }

    let customerId: string | undefined;

    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (client?.stripeCustomerId) {
        customerId = client.stripeCustomerId;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: { clientId: clientId || "" },
      });
      customerId = customer.id;

      if (clientId) {
        await prisma.client.update({
          where: { id: clientId },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    let session;
    if (isPackage) {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `ClearCredit ${DISPUTE_PACKAGES[pkg].name} — ${DISPUTE_PACKAGES[pkg].disputes} Disputes` },
              unit_amount: DISPUTE_PACKAGES[pkg].amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl || `${process.env.NEXTAUTH_URL}/client/dashboard?success=true`,
        cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/signup?canceled=true`,
        metadata: { clientId: clientId || "", package: pkg, disputes: String(DISPUTE_PACKAGES[pkg].disputes), type: "package" },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `ClearCredit ${SUBSCRIPTION_PLANS[plan].name} — ${SUBSCRIPTION_PLANS[plan].disputes} Disputes/mo` },
              unit_amount: SUBSCRIPTION_PLANS[plan].amount,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl || `${process.env.NEXTAUTH_URL}/client/dashboard?success=true`,
        cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/signup?canceled=true`,
        metadata: { clientId: clientId || "", plan, disputes: String(SUBSCRIPTION_PLANS[plan].disputes), type: "subscription" },
      });
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}

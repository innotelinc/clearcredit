import { NextRequest, NextResponse } from "next/server";
import { stripe, getDisputePackage, getSubscriptionPlan, isConfiguredStripePriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { assertCanAccessClient, requireRequestUser } from "@/lib/access-control";
import { buildPublicUrl, getPublicOrigin } from "@/lib/url";
import { getErrorMessage } from "@/lib/errors";

function normalizePath(path: string, request: NextRequest) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const absolute = new URL(path);
    const publicOrigin = getPublicOrigin(request);
    if (absolute.origin !== publicOrigin) {
      throw new Error("Invalid redirect origin");
    }
    return absolute.toString();
  }

  return buildPublicUrl(path.startsWith("/") ? path : `/${path}`, request);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      clientId?: string;
      package?: string;
      plan?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    if (!body.clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    assertCanAccessClient(user, body.clientId);

    const client = await prisma.client.findUnique({ where: { id: body.clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const successUrl = normalizePath(body.successUrl || "/client/dashboard?success=true", request);
    const cancelUrl = normalizePath(body.cancelUrl || "/client/billing?canceled=true", request);

    let stripeCustomerId = client.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: body.email || client.email,
        name: body.name || client.name,
        metadata: { clientId: client.id, businessId: client.businessId },
      });
      stripeCustomerId = customer.id;
      await prisma.client.update({
        where: { id: client.id },
        data: { stripeCustomerId },
      });
    }

    const pkg = body.package ? getDisputePackage(body.package) : null;
    const plan = body.plan ? getSubscriptionPlan(body.plan) : null;

    if (!pkg && !plan) {
      return NextResponse.json({ error: "A valid package or subscription plan is required" }, { status: 400 });
    }

    const isSubscription = Boolean(plan);
    const selected = plan || pkg;
    if (!selected) {
      return NextResponse.json({ error: "Unable to resolve Stripe product" }, { status: 400 });
    }

    const lineItem = isConfiguredStripePriceId(selected.priceId)
      ? { price: selected.priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            unit_amount: selected.amount,
            product_data: {
              name: selected.name,
              description: isSubscription
                ? `${selected.disputes} dispute credits per billing cycle`
                : `${selected.disputes} dispute credits`,
            },
            recurring: isSubscription ? { interval: "month" as const } : undefined,
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      customer: stripeCustomerId,
      customer_update: { address: "auto", name: "auto" },
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [lineItem],
      metadata: {
        clientId: client.id,
        type: isSubscription ? "subscription" : "package",
        package: body.package || "",
        plan: body.plan || "",
        disputes: String(selected.disputes),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const message = getErrorMessage(error, "Failed to start checkout");
    const status = error instanceof Error && message === "Invalid redirect origin" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

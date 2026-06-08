import { NextRequest, NextResponse } from "next/server";
import { stripe, DISPUTE_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getRequestUser, canAccessClient } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";

type CheckoutBody = {
  email?: string;
  name?: string;
  package?: keyof typeof DISPUTE_PACKAGES;
  plan?: keyof typeof SUBSCRIPTION_PLANS;
  clientId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

function normalizeRedirectUrl(url: string | undefined, request: NextRequest, fallbackPath: string): string | null {
  if (!url) {
    return new URL(fallbackPath, request.nextUrl.origin).toString();
  }

  if (url.startsWith("/") && !url.startsWith("//")) {
    return new URL(url, request.nextUrl.origin).toString();
  }

  try {
    const parsed = new URL(url);
    return parsed.origin === request.nextUrl.origin ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const { email, name, package: pkg, plan, clientId, successUrl, cancelUrl } = body;

    if (!clientId || !email) {
      return NextResponse.json({ error: "Client ID and email are required" }, { status: 400 });
    }

    const successRedirect = normalizeRedirectUrl(successUrl, request, "/client/dashboard?success=true");
    if (!successRedirect) {
      return NextResponse.json({ error: "Invalid success URL" }, { status: 400 });
    }

    const cancelRedirect = normalizeRedirectUrl(cancelUrl, request, "/signup?canceled=true");
    if (!cancelRedirect) {
      return NextResponse.json({ error: "Invalid cancel URL" }, { status: 400 });
    }

    const isPackage = pkg ? Boolean(DISPUTE_PACKAGES[pkg]) : false;
    const isPlan = plan ? Boolean(SUBSCRIPTION_PLANS[plan]) : false;

    if (!isPackage && !isPlan) {
      return NextResponse.json({ error: "Invalid package or plan" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        email: true,
        name: true,
        businessId: true,
        userId: true,
        stripeCustomerId: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const requestUser = await getRequestUser(request);

    if (requestUser) {
      if (!canAccessClient(requestUser, client.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const matchesClientIdentity = client.email.toLowerCase() === email.toLowerCase();
      if (!matchesClientIdentity || client.stripeCustomerId) {
        return NextResponse.json({ error: "Authentication required for this checkout session" }, { status: 401 });
      }
    }

    let customerId = client.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: name || client.name || undefined,
        metadata: { clientId: client.id },
      });
      customerId = customer.id;

      await prisma.client.update({
        where: { id: client.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = isPackage
      ? await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: `ClearCredit ${DISPUTE_PACKAGES[pkg!].name} — ${DISPUTE_PACKAGES[pkg!].disputes} Disputes` },
                unit_amount: DISPUTE_PACKAGES[pkg!].amount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: successRedirect,
          cancel_url: cancelRedirect,
          metadata: { clientId: client.id, package: pkg!, disputes: String(DISPUTE_PACKAGES[pkg!].disputes), type: "package" },
        })
      : await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: `ClearCredit ${SUBSCRIPTION_PLANS[plan!].name} — ${SUBSCRIPTION_PLANS[plan!].disputes} Disputes/mo` },
                unit_amount: SUBSCRIPTION_PLANS[plan!].amount,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: successRedirect,
          cancel_url: cancelRedirect,
          metadata: { clientId: client.id, plan: plan!, disputes: String(SUBSCRIPTION_PLANS[plan!].disputes), type: "subscription" },
        });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Failed to create checkout session") }, { status: 500 });
  }
}

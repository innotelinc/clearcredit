import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { recordCreditChange } from "@/lib/credits";
import {
  findSubscriptionPlanByPriceId,
  getSubscriptionPlan,
  stripe,
} from "@/lib/stripe";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

type StripeInvoiceWithLines = Stripe.Invoice & {
  lines?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
    }>;
  };
};

async function markProcessed(event: Stripe.Event, summary?: string) {
  await prisma.stripeWebhookEvent.create({
    data: {
      id: event.id,
      type: event.type,
      summary,
    },
  });
}

export async function POST(request: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature") || "";
  const payloadBuffer = Buffer.from(await request.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payloadBuffer, signature, webhookSecret);
  } catch (error: unknown) {
    console.error("Webhook signature verification failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const existingEvent = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = session.metadata?.clientId;
        if (!clientId) break;

        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) break;

        const purchasedPackage = session.metadata?.package || "";
        const selectedPlan = session.metadata?.plan || "";
        const packageCredits = Number.parseInt(session.metadata?.disputes || "0", 10);

        await prisma.$transaction(async (tx) => {
          await tx.client.update({
            where: { id: clientId },
            data: {
              subscriptionStatus: "active",
              stripeCustomerId: typeof session.customer === "string" ? session.customer : client.stripeCustomerId,
              stripeSubscriptionId:
                typeof session.subscription === "string" ? session.subscription : client.stripeSubscriptionId,
              subscriptionPlan: selectedPlan || client.subscriptionPlan,
              disputePackage: purchasedPackage || client.disputePackage,
            },
          });

          if (purchasedPackage && packageCredits > 0) {
            await recordCreditChange({
              tx,
              clientId,
              amount: packageCredits,
              type: "credit",
              source: "PACKAGE_PURCHASE",
              description: `Stripe package purchase: ${purchasedPackage}`,
              stripeEventId: event.id,
              stripeSessionId: session.id,
            });
          }

          await tx.activityLog.create({
            data: {
              clientId,
              action: purchasedPackage ? "PACKAGE_PURCHASED" : "SUBSCRIPTION_STARTED",
              details: purchasedPackage
                ? `Purchased ${purchasedPackage} package via Stripe.`
                : `Started ${selectedPlan || "subscription"} via Stripe.`,
            },
          });

          await tx.stripeWebhookEvent.create({
            data: {
              id: event.id,
              type: event.type,
              summary: `Checkout completed for client ${clientId}`,
            },
          });
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as StripeInvoiceWithLines;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : "";
        const client = await prisma.client.findFirst({ where: { stripeCustomerId: customerId } });
        if (!client) break;

        const priceId = invoice.lines?.data?.[0]?.price?.id || null;
        const matchedPlan = (await findSubscriptionPlanByPriceId(priceId)) || (client.subscriptionPlan ? await getSubscriptionPlan(client.subscriptionPlan) : null);
        const subscriptionCredits = matchedPlan?.disputes || 0;

        await prisma.$transaction(async (tx) => {
          await tx.invoice.upsert({
            where: { stripeInvoiceId: invoice.id },
            update: {
              status: "PAID",
              paidAt: new Date(),
              amount: (invoice.amount_paid / 100).toString(),
            },
            create: {
              businessId: client.businessId,
              clientId: client.id,
              amount: (invoice.amount_paid / 100).toString(),
              stripeInvoiceId: invoice.id,
              status: "PAID",
              description: invoice.number ? `Stripe invoice ${invoice.number}` : "Stripe invoice",
              paidAt: new Date(),
            },
          });

          if (subscriptionCredits > 0) {
            await recordCreditChange({
              tx,
              clientId: client.id,
              amount: subscriptionCredits,
              type: "credit",
              source: "SUBSCRIPTION_RENEWAL",
              description: `Subscription renewal credits for ${matchedPlan?.key || client.subscriptionPlan || "subscription plan"}`,
              stripeEventId: event.id,
              stripeInvoiceId: invoice.id,
            });
          }

          await tx.client.update({
            where: { id: client.id },
            data: {
              subscriptionStatus: "active",
              subscriptionPlan: matchedPlan?.key || client.subscriptionPlan,
            },
          });

          await tx.activityLog.create({
            data: {
              clientId: client.id,
              action: "INVOICE_PAID",
              details: `Stripe invoice paid: ${invoice.id}`,
            },
          });

          await tx.stripeWebhookEvent.create({
            data: {
              id: event.id,
              type: event.type,
              summary: `Invoice paid for client ${client.id}`,
            },
          });
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : "";
        const client = await prisma.client.findFirst({ where: { stripeCustomerId: customerId } });
        if (!client) break;

        await prisma.$transaction(async (tx) => {
          await tx.client.update({
            where: { id: client.id },
            data: { subscriptionStatus: "past_due" },
          });

          await tx.activityLog.create({
            data: {
              clientId: client.id,
              action: "PAYMENT_FAILED",
              details: `Stripe invoice payment failed: ${invoice.id}`,
            },
          });

          await tx.stripeWebhookEvent.create({
            data: {
              id: event.id,
              type: event.type,
              summary: `Invoice failed for client ${client.id}`,
            },
          });
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : "";
        const client = await prisma.client.findFirst({ where: { stripeCustomerId: customerId } });
        if (!client) break;

        await prisma.$transaction(async (tx) => {
          await tx.client.update({
            where: { id: client.id },
            data: {
              subscriptionStatus: "cancelled",
              stripeSubscriptionId: null,
              subscriptionPlan: null,
            },
          });

          await tx.activityLog.create({
            data: {
              clientId: client.id,
              action: "SUBSCRIPTION_CANCELLED",
              details: `Stripe subscription cancelled: ${subscription.id}`,
            },
          });

          await tx.stripeWebhookEvent.create({
            data: {
              id: event.id,
              type: event.type,
              summary: `Subscription cancelled for client ${client.id}`,
            },
          });
        });
        break;
      }

      default: {
        await markProcessed(event, "Ignored event type");
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

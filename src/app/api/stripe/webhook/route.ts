import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe, SUBSCRIPTION_PLANS } from "@/lib/stripe";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature") || "";
  const payloadBuffer = Buffer.from(await request.arrayBuffer());

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payloadBuffer, signature, webhookSecret);
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = session.metadata?.clientId;
        const pkg = session.metadata?.package;
        const plan = session.metadata?.plan;
        const disputesToAdd = Number.parseInt(session.metadata?.disputes || "0", 10);
        const type = session.metadata?.type;

        if (clientId) {
          const client = await prisma.client.findUnique({ where: { id: clientId } });
          if (client) {
            const updateData: Prisma.ClientUpdateInput = {
              subscriptionStatus: "active",
              stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
            };

            if (type === "subscription" && plan) {
              updateData.stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
              updateData.subscriptionPlan = plan;
            } else if (pkg) {
              updateData.disputePackage = pkg;
              updateData.disputeCredits = { increment: disputesToAdd };
            }

            await prisma.client.update({
              where: { id: clientId },
              data: updateData,
            });

            await prisma.activityLog.create({
              data: {
                clientId,
                action: type === "subscription" ? "SUBSCRIPTION_STARTED" : "PACKAGE_PURCHASED",
                details:
                  type === "subscription"
                    ? `Started ${plan} subscription (+${disputesToAdd} dispute credits/mo) via Stripe`
                    : `Purchased ${pkg} package (+${disputesToAdd} dispute credits) via Stripe`,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as StripeInvoiceWithSubscription;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : "";

        const client = await prisma.client.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (client) {
          await prisma.invoice.upsert({
            where: { stripeInvoiceId: invoice.id },
            update: {
              status: "PAID",
              paidAt: new Date(),
            },
            create: {
              businessId: client.businessId,
              clientId: client.id,
              amount: (invoice.amount_due / 100).toString(),
              stripeInvoiceId: invoice.id,
              status: "PAID",
              description: `Stripe invoice ${invoice.number || ""}`,
              paidAt: new Date(),
            },
          });

          const hasSubscription = Boolean(invoice.subscription);
          if (hasSubscription && client.subscriptionPlan) {
            const plan = SUBSCRIPTION_PLANS[client.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
            if (plan) {
              await prisma.client.update({
                where: { id: client.id },
                data: {
                  subscriptionStatus: "active",
                  disputeCredits: { increment: plan.disputes },
                },
              });
              await prisma.activityLog.create({
                data: {
                  clientId: client.id,
                  action: "SUBSCRIPTION_RENEWED",
                  details: `${plan.name} renewed — +${plan.disputes} dispute credits added`,
                },
              });
            }
          } else if (client.subscriptionStatus !== "active") {
            await prisma.client.update({
              where: { id: client.id },
              data: { subscriptionStatus: "active" },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : "";

        const client = await prisma.client.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (client) {
          await prisma.client.update({
            where: { id: client.id },
            data: { subscriptionStatus: "past_due" },
          });

          await prisma.activityLog.create({
            data: {
              clientId: client.id,
              action: "PAYMENT_FAILED",
              details: `Invoice payment failed: ${invoice.id}`,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : "";

        const client = await prisma.client.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (client) {
          await prisma.client.update({
            where: { id: client.id },
            data: { subscriptionStatus: "cancelled", stripeSubscriptionId: null, subscriptionPlan: null },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

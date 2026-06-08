import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireRequestUser } from "@/lib/access-control";
import { buildPublicUrl } from "@/lib/url";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const client = await prisma.client.findFirst({ where: { userId: user.id } });

    if (!client?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found for this client" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripeCustomerId,
      return_url: buildPublicUrl("/client/billing", request),
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe portal error:", error);
    const message = getErrorMessage(error, "Failed to open billing portal");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireRequestUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { buildPublicUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { clients: true },
    });

    if (!dbUser?.clients?.length) {
      return NextResponse.json({ error: "No client profile found" }, { status: 400 });
    }

    const client = dbUser.clients[0];
    if (!client?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripeCustomerId,
      return_url: buildPublicUrl("/client/billing", request),
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe portal error:", error);
    const message = getErrorMessage(error, "Failed to create portal session");
    const status = error instanceof Error && "status" in error ? Number((error as { status?: number }).status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

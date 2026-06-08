import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
      include: {
        clients: {
          include: {
            disputes: { orderBy: { createdAt: "desc" } },
            contracts: { orderBy: { createdAt: "desc" } },
            creditReports: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = user.clients[0] || null;
    if (client) {
      const disputes = await prisma.disputeItem.findMany({
        where: { clientId: client.id },
        include: { letters: { orderBy: { generatedAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      });
      const creditReports = await prisma.creditReport.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
      });
      const invoices = await prisma.invoice.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        client: { ...client, email: client.email, name: client.name, disputes, creditReports, invoices },
      });
    }

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, client });
  } catch (error) {
    console.error("Me route error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

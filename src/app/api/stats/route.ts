import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [resolvedDisputes, totalClients, totalRevenueAgg] = await Promise.all([
      prisma.disputeItem.count({ where: { status: "RESOLVED" } }),
      prisma.client.count(),
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(totalRevenueAgg._sum.amount || 0);

    return NextResponse.json({
      resolvedDisputes,
      totalClients,
      totalRevenue,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { resolvedDisputes: 0, totalClients: 0, totalRevenue: 0 },
      { status: 500 }
    );
  }
}

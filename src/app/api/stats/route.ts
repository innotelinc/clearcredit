import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);

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
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : status === 403 ? "Admin access required" : "Failed to fetch stats" },
      { status }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateDisputeLetter } from "@/lib/ai-letter";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { disputeItemId } = body;

    if (!disputeItemId) {
      return NextResponse.json({ error: "Dispute item ID is required" }, { status: 400 });
    }

    const { letter } = await generateDisputeLetter(disputeItemId);
    return NextResponse.json({ letter }, { status: 201 });
  } catch (error: any) {
    console.error("AI letter generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate letter" }, { status: 500 });
  }
}

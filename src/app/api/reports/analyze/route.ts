import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateDisputeLetter } from "@/lib/ai-letter";
import { isAdmin, requireRequestUser } from "@/lib/access-control";
import { getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ParsedDisputeCandidate {
  bureau?: string;
  type?: string;
  description?: string;
  creditor?: string | null;
  accountNumber?: string | null;
  amount?: string | null;
  confidenceScore?: number | null;
  reason?: string | null;
}

function parseDisputeCandidates(content: string): ParsedDisputeCandidate[] {
  const firstBracket = content.indexOf("[");
  const lastBracket = content.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    return [];
  }

  const parsed = JSON.parse(content.slice(firstBracket, lastBracket + 1)) as unknown;
  return Array.isArray(parsed) ? parsed.filter((item): item is ParsedDisputeCandidate => typeof item === "object" && item !== null) : [];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const report = await prisma.creditReport.findUnique({
      where: { id: reportId },
      include: { client: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (!isAdmin(user) && report.client.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!report.rawData || report.rawData.length < 50) {
      return NextResponse.json({ error: "Report has no analyzable data" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const prompt = `You are an expert credit report analyst. Analyze the following credit report text and extract ALL negative, inaccurate, outdated, or potentially unverifiable items that should be disputed under the Fair Credit Reporting Act (FCRA).

Credit Report:
"""
${report.rawData.slice(0, 12000)}
"""

For each item you identify, provide:
1. bureau - which credit bureau (Experian, TransUnion, Equifax, or Unknown)
2. type - the type of item (e.g., Late Payment, Collection, Charge-off, Inquiry, Bankruptcy, Foreclosure, Public Record, Incorrect Personal Info, Duplicate Account, etc.)
3. description - a brief description of the issue
4. creditor - the name of the creditor or collection agency (if known)
5. accountNumber - the account number or partial account number (if known)
6. amount - the reported amount (if known)
7. confidenceScore - your confidence this item is disputable (0-100)
8. reason - why this item may be disputable

Respond ONLY with a valid JSON array. No markdown, no commentary, no code blocks.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a credit report dispute analyst. Always respond with only valid JSON arrays." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "";

    let parsedItems: ParsedDisputeCandidate[] = [];
    try {
      parsedItems = parseDisputeCandidates(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json({ error: "AI response parsing failed" }, { status: 500 });
    }

    const client = await prisma.client.findUnique({ where: { id: report.clientId } });
    const validItems = parsedItems.filter((item) => item.type && item.description);

    if (!client || client.disputeCredits < validItems.length) {
      return NextResponse.json({
        error: `Insufficient dispute credits. You have ${client?.disputeCredits ?? 0} credits but ${validItems.length} disputes were found. Please purchase a larger package.`,
      }, { status: 403 });
    }

    const createdDisputes = [];
    for (const item of validItems) {
      const dispute = await prisma.disputeItem.create({
        data: {
          reportId: report.id,
          clientId: report.clientId,
          bureau: item.bureau || report.bureau || "Unknown",
          type: item.type!,
          description: item.description!,
          creditor: item.creditor || null,
          accountNumber: item.accountNumber || null,
          amount: item.amount || null,
          confidenceScore: typeof item.confidenceScore === "number" ? item.confidenceScore : null,
          status: "TO_DISPUTE",
          notes: item.reason || null,
        },
      });
      createdDisputes.push(dispute);
    }

    const newCredits = Math.max(0, client.disputeCredits - createdDisputes.length);
    await prisma.client.update({
      where: { id: report.clientId },
      data: { disputeCredits: newCredits },
    });

    if (newCredits <= 2 && newCredits > 0) {
      const { sendLowCreditAlert } = await import("@/lib/email");
      await sendLowCreditAlert(client.email, client.name, newCredits).catch(() => undefined);
    }

    await prisma.creditReport.update({
      where: { id: report.id },
      data: {
        parsedData: JSON.stringify(parsedItems),
        analyzedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        clientId: report.clientId,
        action: "REPORT_ANALYZED",
        details: `AI analyzed ${report.bureau} report and found ${createdDisputes.length} disputable items`,
      },
    });

    const highConfidence = createdDisputes.filter((dispute) => (dispute.confidenceScore || 0) >= 70);
    const generatedLetters = [];

    for (const dispute of highConfidence) {
      try {
        const { letter } = await generateDisputeLetter(dispute.id);
        generatedLetters.push(letter);
      } catch {
        console.error("Auto-letter generation failed for dispute", dispute.id);
      }
    }

    return NextResponse.json({
      reportId: report.id,
      disputesFound: createdDisputes.length,
      disputes: createdDisputes,
      lettersGenerated: generatedLetters.length,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Analyze report error:", error);
    const message = getErrorMessage(error, "Failed to analyze report");
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

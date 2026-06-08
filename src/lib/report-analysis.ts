import OpenAI from "openai";
import { generateDisputeLetter } from "@/lib/ai-letter";
import { HttpError, isAdmin, type AccessUser } from "@/lib/access-control";
import { recordCreditChange } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

export interface AnalyzeCreditReportResult {
  reportId: string;
  disputesFound: number;
  disputesCreated: number;
  disputes: Array<{
    id: string;
    bureau: string;
    type: string;
    description: string;
    creditor: string | null;
    accountNumber: string | null;
    amount: string | null;
    confidenceScore: number | null;
    status: string;
    notes: string | null;
  }>;
  lettersGenerated: number;
  creditsConsumed: number;
  creditsRemaining: number;
  skippedDueToCredits: number;
  reusedExisting: boolean;
}

function parseDisputeCandidates(content: string): ParsedDisputeCandidate[] {
  const firstBracket = content.indexOf("[");
  const lastBracket = content.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    return [];
  }

  const parsed = JSON.parse(content.slice(firstBracket, lastBracket + 1)) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (item): item is ParsedDisputeCandidate => typeof item === "object" && item !== null,
  );
}

function buildCandidateKey(candidate: {
  bureau: string;
  type: string;
  description: string;
  creditor: string | null;
  accountNumber: string | null;
}) {
  return [
    candidate.bureau.toLowerCase(),
    candidate.type.toLowerCase(),
    candidate.description.toLowerCase(),
    (candidate.creditor || "").toLowerCase(),
    (candidate.accountNumber || "").toLowerCase(),
  ].join("::");
}

function normalizeCandidates(
  items: ParsedDisputeCandidate[],
  defaultBureau: string,
): Array<{
  bureau: string;
  type: string;
  description: string;
  creditor: string | null;
  accountNumber: string | null;
  amount: string | null;
  confidenceScore: number | null;
  reason: string | null;
}> {
  const seen = new Set<string>();

  return items
    .map((item) => {
      const type = item.type?.trim();
      const description = item.description?.trim();
      if (!type || !description) {
        return null;
      }

      const candidate = {
        bureau: item.bureau?.trim() || defaultBureau || "Unknown",
        type,
        description,
        creditor: item.creditor?.trim() || null,
        accountNumber: item.accountNumber?.trim() || null,
        amount: item.amount?.trim() || null,
        confidenceScore:
          typeof item.confidenceScore === "number"
            ? Math.max(0, Math.min(100, Math.round(item.confidenceScore)))
            : null,
        reason: item.reason?.trim() || null,
      };

      const key = buildCandidateKey(candidate);
      if (seen.has(key)) {
        return null;
      }

      seen.add(key);
      return candidate;
    })
    .filter(
      (
        item,
      ): item is {
        bureau: string;
        type: string;
        description: string;
        creditor: string | null;
        accountNumber: string | null;
        amount: string | null;
        confidenceScore: number | null;
        reason: string | null;
      } => item !== null,
    );
}

export async function analyzeCreditReport({
  reportId,
  actor,
  force = false,
}: {
  reportId: string;
  actor: AccessUser;
  force?: boolean;
}): Promise<AnalyzeCreditReportResult> {
  const report = await prisma.creditReport.findUnique({
    where: { id: reportId },
    include: {
      client: true,
      disputes: {
        include: { letters: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!report) {
    throw new HttpError(404, "Report not found");
  }

  if (!isAdmin(actor) && report.client.userId !== actor.id) {
    throw new HttpError(403, "Access denied");
  }

  if (!report.rawData || report.rawData.length < 50) {
    throw new HttpError(400, "Report has no analyzable data");
  }

  if (!openai) {
    throw new HttpError(500, "OpenAI API key not configured");
  }

  if (!force && report.analyzedAt && report.disputes.length > 0) {
    return {
      reportId: report.id,
      disputesFound: report.disputes.length,
      disputesCreated: 0,
      disputes: report.disputes.map((dispute) => ({
        id: dispute.id,
        bureau: dispute.bureau,
        type: dispute.type,
        description: dispute.description,
        creditor: dispute.creditor,
        accountNumber: dispute.accountNumber,
        amount: dispute.amount,
        confidenceScore: dispute.confidenceScore,
        status: dispute.status,
        notes: dispute.notes,
      })),
      lettersGenerated: report.disputes.reduce((count, dispute) => count + dispute.letters.length, 0),
      creditsConsumed: 0,
      creditsRemaining: report.client.disputeCredits,
      skippedDueToCredits: 0,
      reusedExisting: true,
    };
  }

  const prompt = `You are an expert credit report analyst. Analyze the following credit report text and extract all negative, inaccurate, outdated, or potentially unverifiable items that should be disputed under the Fair Credit Reporting Act (FCRA).

Credit Report:
"""
${report.rawData.slice(0, 12000)}
"""

For each item you identify, provide:
1. bureau
2. type
3. description
4. creditor
5. accountNumber
6. amount
7. confidenceScore (0-100)
8. reason

Respond ONLY with a valid JSON array. No markdown, no commentary, no code blocks.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a credit report dispute analyst. Always respond with only valid JSON arrays.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 4000,
  });

  const content = completion.choices[0]?.message?.content || "";
  let parsedItems: ParsedDisputeCandidate[] = [];

  try {
    parsedItems = parseDisputeCandidates(content);
  } catch (error) {
    console.error("Failed to parse AI response", error, content);
    throw new HttpError(500, "AI response parsing failed");
  }

  const normalizedCandidates = normalizeCandidates(
    parsedItems,
    report.bureau || "Unknown",
  );

  const existingKeys = new Set(
    report.disputes.map((dispute) =>
      buildCandidateKey({
        bureau: dispute.bureau,
        type: dispute.type,
        description: dispute.description,
        creditor: dispute.creditor,
        accountNumber: dispute.accountNumber,
      }),
    ),
  );

  const creatableCandidates = force
    ? normalizedCandidates
    : normalizedCandidates.filter((candidate) => !existingKeys.has(buildCandidateKey(candidate)));

  if (report.client.disputeCredits <= 0 && creatableCandidates.length > 0) {
    throw new HttpError(403, "Client has no remaining dispute credits");
  }

  const candidatesToCreate = creatableCandidates.slice(0, report.client.disputeCredits);
  const skippedDueToCredits = Math.max(0, creatableCandidates.length - candidatesToCreate.length);

  let createdDisputes: Array<{
    id: string;
    bureau: string;
    type: string;
    description: string;
    creditor: string | null;
    accountNumber: string | null;
    amount: string | null;
    confidenceScore: number | null;
    status: string;
    notes: string | null;
  }> = [];
  let remainingCredits = report.client.disputeCredits;

  await prisma.$transaction(async (tx) => {
    createdDisputes = [];

    for (const candidate of candidatesToCreate) {
      const dispute = await tx.disputeItem.create({
        data: {
          reportId: report.id,
          clientId: report.clientId,
          bureau: candidate.bureau,
          type: candidate.type,
          description: candidate.description,
          creditor: candidate.creditor,
          accountNumber: candidate.accountNumber,
          amount: candidate.amount,
          confidenceScore: candidate.confidenceScore,
          status: "TO_DISPUTE",
          notes: candidate.reason,
        },
      });

      createdDisputes.push({
        id: dispute.id,
        bureau: dispute.bureau,
        type: dispute.type,
        description: dispute.description,
        creditor: dispute.creditor,
        accountNumber: dispute.accountNumber,
        amount: dispute.amount,
        confidenceScore: dispute.confidenceScore,
        status: dispute.status,
        notes: dispute.notes,
      });
    }

    if (createdDisputes.length > 0) {
      const updatedClient = await recordCreditChange({
        tx,
        clientId: report.clientId,
        amount: createdDisputes.length,
        type: "debit",
        source: "REPORT_ANALYSIS",
        description: `AI-created ${createdDisputes.length} dispute item(s) from uploaded credit report`,
      });
      remainingCredits = updatedClient.disputeCredits;
    }

    await tx.creditReport.update({
      where: { id: report.id },
      data: {
        parsedData: JSON.stringify(parsedItems),
        analyzedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: report.clientId,
        action: "REPORT_ANALYZED",
        details: `AI analyzed ${report.bureau || "credit"} report and identified ${normalizedCandidates.length} disputable item(s). ${createdDisputes.length} created.${skippedDueToCredits ? ` ${skippedDueToCredits} skipped due to insufficient credits.` : ""}`,
      },
    });
  });

  let lettersGenerated = 0;
  for (const dispute of createdDisputes.filter((item) => (item.confidenceScore || 0) >= 70)) {
    try {
      await generateDisputeLetter(dispute.id);
      lettersGenerated += 1;
    } catch (error) {
      console.error("Auto-letter generation failed for dispute", dispute.id, error);
    }
  }

  if (remainingCredits <= 2 && remainingCredits > 0) {
    const { sendLowCreditAlert } = await import("@/lib/email");
    await sendLowCreditAlert(report.client.email, report.client.name, remainingCredits).catch(
      () => undefined,
    );
  }

  return {
    reportId: report.id,
    disputesFound: normalizedCandidates.length,
    disputesCreated: createdDisputes.length,
    disputes: createdDisputes,
    lettersGenerated,
    creditsConsumed: createdDisputes.length,
    creditsRemaining: remainingCredits,
    skippedDueToCredits,
    reusedExisting: false,
  };
}

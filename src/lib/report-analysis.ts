import OpenAI from "openai";
import { generateDisputeLetter } from "@/lib/ai-letter";
import { HttpError, isAdmin, type AccessUser } from "@/lib/access-control";
import { recordCreditChange } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import {
  buildFallbackDisputeCandidates,
  parseStructuredCreditReport,
  type StructuredCreditReport,
} from "@/lib/report-parsing";

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
  return Array.isArray(parsed)
    ? parsed.filter((item): item is ParsedDisputeCandidate => typeof item === "object" && item !== null)
    : [];
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

function normalizeCandidates(items: ParsedDisputeCandidate[], defaultBureau: string) {
  const seen = new Set<string>();

  return items
    .map((item) => {
      const type = item.type?.trim();
      const description = item.description?.trim();
      if (!type || !description) return null;

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
      if (seen.has(key)) return null;
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

async function extractAiCandidates(report: StructuredCreditReport, rawData: string) {
  if (!openai) {
    return [] as ParsedDisputeCandidate[];
  }

  const prompt = `You are an expert credit report analyst. Use the structured report JSON and the raw report excerpt to identify disputable items under the FCRA.

Structured report JSON:
${JSON.stringify(report, null, 2).slice(0, 8000)}

Raw report excerpt:
"""
${rawData.slice(0, 8000)}
"""

Return ONLY a valid JSON array. Each item must include: bureau, type, description, creditor, accountNumber, amount, confidenceScore, reason.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a credit report dispute analyst. Always respond with only valid JSON arrays.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 3000,
  });

  const content = completion.choices[0]?.message?.content || "";
  return parseDisputeCandidates(content);
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

  if (!report) throw new HttpError(404, "Report not found");
  if (!isAdmin(actor) && report.client.userId !== actor.id) throw new HttpError(403, "Access denied");
  if (!report.rawData || report.rawData.length < 30) throw new HttpError(400, "Report has no analyzable data");

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

  const structured = parseStructuredCreditReport(report.rawData, report.bureau || "Unknown");
  const fallbackCandidates = buildFallbackDisputeCandidates(structured);

  let aiCandidates: ParsedDisputeCandidate[] = [];
  try {
    aiCandidates = await extractAiCandidates(structured, report.rawData);
  } catch (error) {
    console.error("AI extraction failed; using deterministic parser fallback", error);
  }

  const normalizedCandidates = normalizeCandidates(
    aiCandidates.length ? [...fallbackCandidates, ...aiCandidates] : fallbackCandidates,
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

  const createdDisputes: Array<{
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
          followUpAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
        description: `AI/structured analysis created ${createdDisputes.length} dispute item(s) from credit report`,
      });
      remainingCredits = updatedClient.disputeCredits;
    }

    await tx.creditReport.update({
      where: { id: report.id },
      data: {
        parsedData: JSON.stringify({ structured, aiCandidates }),
        analyzedAt: new Date(),
        providerStatus: report.providerStatus === "UPLOADED" ? "UPLOADED" : report.providerStatus,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: report.clientId,
        action: "REPORT_ANALYZED",
        details: `Structured/AI analysis identified ${normalizedCandidates.length} disputable item(s); ${createdDisputes.length} created.${skippedDueToCredits ? ` ${skippedDueToCredits} skipped due to insufficient credits.` : ""}`,
      },
    });
  });

  let lettersGenerated = 0;
  for (const dispute of createdDisputes.filter((item) => (item.confidenceScore || 0) >= 65)) {
    try {
      await generateDisputeLetter(dispute.id);
      await prisma.disputeItem.update({
        where: { id: dispute.id },
        data: { status: "DRAFTING", lastAutomatedActionAt: new Date() },
      });
      lettersGenerated += 1;
    } catch (error) {
      console.error("Auto-letter generation failed for dispute", dispute.id, error);
    }
  }

  if (remainingCredits <= 2 && remainingCredits > 0) {
    const { sendLowCreditAlert } = await import("@/lib/email");
    await sendLowCreditAlert(report.client.email, report.client.name, remainingCredits).catch(() => undefined);
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

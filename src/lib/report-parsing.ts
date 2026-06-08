export interface StructuredNegativeItem {
  bureau: string;
  category: string;
  description: string;
  creditor: string | null;
  accountNumber: string | null;
  amount: string | null;
  reason: string;
}

export interface StructuredCreditReport {
  bureaus: string[];
  scores: Record<string, number | null>;
  negativeItems: StructuredNegativeItem[];
  rawLines: string[];
}

const bureauNames = ["Experian", "TransUnion", "Equifax"] as const;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function detectBureau(line: string, fallbackBureau: string) {
  const match = bureauNames.find((bureau) => line.toLowerCase().includes(bureau.toLowerCase()));
  return match || fallbackBureau || "Unknown";
}

function detectCategory(line: string) {
  const normalized = line.toLowerCase();
  if (normalized.includes("collection")) return "Collection account";
  if (normalized.includes("charge off") || normalized.includes("charge-off")) return "Charge off";
  if (normalized.includes("late payment") || normalized.includes("30 days late") || normalized.includes("60 days late") || normalized.includes("90 days late")) return "Late payment";
  if (normalized.includes("inquiry")) return "Hard inquiry";
  if (normalized.includes("address") || normalized.includes("personal information") || normalized.includes("employer")) return "Personal information mismatch";
  if (normalized.includes("repossession")) return "Repossession";
  if (normalized.includes("bankruptcy")) return "Bankruptcy";
  return "Negative item";
}

function extractAccountNumber(line: string) {
  const match = line.match(/(?:ending|acct|account)(?:\s*(?:number|#|no\.?))?\s*[:#-]?\s*([A-Z0-9*\-]{3,})/i);
  return match?.[1] || null;
}

function extractAmount(line: string) {
  const match = line.match(/\$\s?([0-9][0-9,]*(?:\.[0-9]{2})?)/);
  return match ? `$${match[1]}` : null;
}

function extractCreditor(line: string) {
  const clean = line.replace(/^[-*•\s]+/, "").trim();
  const fromMatch = clean.match(/from\s+([^,;]+)/i);
  if (fromMatch) return titleCase(fromMatch[1].trim());

  const onMatch = clean.match(/on\s+([^,;]+)/i);
  if (onMatch && clean.toLowerCase().includes("late payment")) {
    return titleCase(onMatch[1].trim());
  }

  const firstChunk = clean.split(/,|\(| - /)[0]?.trim();
  if (!firstChunk) return null;
  if (/late payment|inquiry|address|personal information|employer/i.test(firstChunk)) return null;
  return titleCase(firstChunk.replace(/^(collection account|charge off|hard inquiry)\s+/i, "").trim()) || null;
}

function lineLooksNegative(line: string) {
  return /(collection|charge off|charge-off|late payment|days late|inquiry|repossession|bankruptcy|address|personal information|employer mismatch)/i.test(line);
}

export function parseStructuredCreditReport(rawData: string, fallbackBureau = "Unknown"): StructuredCreditReport {
  const rawLines = rawData
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bureaus = new Set<string>();
  const scores: Record<string, number | null> = {};
  const negativeItems: StructuredNegativeItem[] = [];

  let activeBureau = fallbackBureau || "Unknown";
  for (const line of rawLines) {
    const bureau = detectBureau(line, activeBureau);
    if (bureau !== activeBureau) {
      activeBureau = bureau;
    }
    if (bureau && bureau !== "Unknown") {
      bureaus.add(bureau);
    }

    const scoreMatch = line.match(/score\s*[:#-]?\s*(\d{3})/i);
    if (scoreMatch) {
      scores[activeBureau] = Number.parseInt(scoreMatch[1], 10);
    }

    if (!lineLooksNegative(line)) continue;

    negativeItems.push({
      bureau: activeBureau,
      category: detectCategory(line),
      description: line.replace(/^[-*•\s]+/, "").trim(),
      creditor: extractCreditor(line),
      accountNumber: extractAccountNumber(line),
      amount: extractAmount(line),
      reason: "Detected by structured parsing from common adverse-credit-report patterns.",
    });
  }

  if (!negativeItems.length && rawLines.length) {
    negativeItems.push({
      bureau: fallbackBureau || "Unknown",
      category: "Negative item",
      description: rawLines.slice(0, 5).join(" | "),
      creditor: null,
      accountNumber: null,
      amount: null,
      reason: "Fallback parser captured the report summary for manual/AI review.",
    });
  }

  return {
    bureaus: Array.from(bureaus),
    scores,
    negativeItems,
    rawLines,
  };
}

export function buildFallbackDisputeCandidates(report: StructuredCreditReport) {
  return report.negativeItems.map((item) => ({
    bureau: item.bureau,
    type: item.category,
    description: item.description,
    creditor: item.creditor,
    accountNumber: item.accountNumber,
    amount: item.amount,
    confidenceScore: item.category === "Negative item" ? 55 : 72,
    reason: item.reason,
  }));
}

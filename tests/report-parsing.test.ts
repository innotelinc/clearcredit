import { describe, expect, it } from "vitest";
import {
  buildFallbackDisputeCandidates,
  parseStructuredCreditReport,
} from "@/lib/report-parsing";

describe("report parsing", () => {
  it("extracts bureaus, scores, and negative items from semi-structured report text", () => {
    const raw = `Experian Credit Report\nScore: 612\n- Collection account from Midland Credit Management, balance $428, account ending 1822\n- Late payment on Capital One account ending 4455 reported 60 days late\n- Hard inquiry from Unknown Auto Finance on 2025-11-14\n- Personal information mismatch on current address`;

    const report = parseStructuredCreditReport(raw, "Experian");

    expect(report.bureaus).toContain("Experian");
    expect(report.scores.Experian).toBe(612);
    expect(report.negativeItems).toHaveLength(4);
    expect(report.negativeItems[0]?.creditor).toContain("Midland");
  });

  it("builds deterministic fallback dispute candidates", () => {
    const raw = `TransUnion\nScore: 701\n- Charge off from Synchrony Bank, balance $1200`;
    const report = parseStructuredCreditReport(raw, "TransUnion");
    const candidates = buildFallbackDisputeCandidates(report);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.bureau).toBe("TransUnion");
    expect(candidates[0]?.type).toBe("Charge off");
    expect(candidates[0]?.amount).toBe("$1200");
  });
});

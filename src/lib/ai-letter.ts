import { generateLlmText } from "@/lib/llm";
import { prisma } from "./prisma";

export async function generateDisputeLetter(disputeItemId: string) {
  const dispute = await prisma.disputeItem.findUnique({
    where: { id: disputeItemId },
    include: { client: true, report: true },
  });

  if (!dispute) {
    throw new Error("Dispute not found");
  }

  const prompt = `Write a formal FCRA-compliant credit dispute letter from a consumer to ${dispute.bureau}. 

Consumer: ${dispute.client.name}
Dispute Type: ${dispute.type}
Description: ${dispute.description}
Creditor: ${dispute.creditor || "N/A"}
Account Number: ${dispute.accountNumber || "N/A"}
Amount: ${dispute.amount || "N/A"}

The letter should:
1. Reference the Fair Credit Reporting Act (FCRA) 15 U.S.C. § 1681 et seq.
2. Request verification and investigation of the disputed item
3. Demand removal if the information cannot be verified
4. Request a response within 30 days as required by law
5. Include a professional but firm tone

Return ONLY the letter content with no extra commentary.`;

  const response = await generateLlmText({
    task: "letter",
    system: "You are an expert legal assistant specializing in Fair Credit Reporting Act (FCRA) dispute letters.",
    user: prompt,
    temperature: 0.7,
    maxTokens: 1500,
  });

  const letter = await prisma.disputeLetter.create({
    data: {
      disputeItemId: dispute.id,
      templateType: "AI_GENERATED_FCRA",
      content: response.text,
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId: dispute.clientId,
      action: "LETTER_GENERATED",
      details: `AI-generated FCRA letter for ${dispute.bureau} dispute using ${response.backend}/${response.model}`,
    },
  });

  return { letter, dispute };
}

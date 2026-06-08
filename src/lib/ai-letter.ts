import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateDisputeLetter(disputeItemId: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert legal assistant specializing in Fair Credit Reporting Act (FCRA) dispute letters." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  const letterContent = completion.choices[0]?.message?.content || "";

  const letter = await prisma.disputeLetter.create({
    data: {
      disputeItemId: dispute.id,
      templateType: "AI_GENERATED_FCRA",
      content: letterContent,
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId: dispute.clientId,
      action: "LETTER_GENERATED",
      details: `AI-generated FCRA letter for ${dispute.bureau} dispute`,
    },
  });

  return { letter, dispute };
}

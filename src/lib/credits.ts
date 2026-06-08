import { Prisma } from "@prisma/client";

export type CreditTransactionType = "credit" | "debit";

export interface RecordCreditChangeInput {
  tx: Prisma.TransactionClient;
  clientId: string;
  amount: number;
  type: CreditTransactionType;
  source: string;
  description?: string;
  stripeEventId?: string | null;
  stripeInvoiceId?: string | null;
  stripeSessionId?: string | null;
}

export async function recordCreditChange({
  tx,
  clientId,
  amount,
  type,
  source,
  description,
  stripeEventId,
  stripeInvoiceId,
  stripeSessionId,
}: RecordCreditChangeInput) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Credit change amount must be a positive integer");
  }

  const delta = type === "credit" ? amount : -amount;

  const client = await tx.client.update({
    where: { id: clientId },
    data: {
      disputeCredits: { increment: delta },
    },
  });

  if (client.disputeCredits < 0) {
    throw new Error("Client credit balance cannot be negative");
  }

  await tx.creditTransaction.create({
    data: {
      clientId,
      amount: delta,
      type,
      source,
      description,
      stripeEventId: stripeEventId || undefined,
      stripeInvoiceId: stripeInvoiceId || undefined,
      stripeSessionId: stripeSessionId || undefined,
    },
  });

  return client;
}

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[EMAIL LOG - no RESEND_API_KEY configured]");
    console.log("To:", payload.to);
    console.log("Subject:", payload.subject);
    console.log("Body:", payload.text);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || `<p>${payload.text.replace(/\n/g, "<br/>")}</p>`,
    });

    if (error) {
      console.error("Resend email error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Email send error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendLowCreditAlert(email: string, name: string, remainingCredits: number) {
  return sendEmail({
    to: email,
    subject: "Low Dispute Credits — ClearCredit",
    text: `Hi ${name},

You have ${remainingCredits} dispute credit${remainingCredits === 1 ? "" : "s"} remaining on your ClearCredit account.

To continue filing disputes and improving your credit, purchase additional credits from your billing page.

Best,
The ClearCredit Team`,
    html: `<p>Hi ${name},</p>
<p>You have <strong>${remainingCredits}</strong> dispute credit${remainingCredits === 1 ? "" : "s"} remaining on your ClearCredit account.</p>
<p>To continue filing disputes and improving your credit, purchase additional credits from your billing page.</p>
<p>Best,<br/>The ClearCredit Team</p>`,
  });
}

export async function sendCreditPurchaseConfirmation(email: string, name: string, packageName: string, creditsAdded: number) {
  return sendEmail({
    to: email,
    subject: "Credits Added — ClearCredit",
    text: `Hi ${name},

Thank you for your purchase! ${creditsAdded} dispute credit${creditsAdded === 1 ? "" : "s"} have been added to your account (${packageName}).

Best,
The ClearCredit Team`,
    html: `<p>Hi ${name},</p>
<p>Thank you for your purchase! <strong>${creditsAdded}</strong> dispute credit${creditsAdded === 1 ? "" : "s"} have been added to your account (${packageName}).</p>
<p>Best,<br/>The ClearCredit Team</p>`,
  });
}

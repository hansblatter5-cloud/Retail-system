// Minimal email abstraction. If RESEND_API_KEY is set, sends via Resend's
// HTTP API (no extra dependency needed — uses the global fetch). Otherwise
// falls back to logging the email to the console, which is exactly what you
// want in local development: you can see the reset link without needing a
// real mail provider configured yet.

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || "no-reply@example.com";

  if (!apiKey) {
    console.log("\n--- EMAIL (dev fallback, no RESEND_API_KEY configured) ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    console.log("--- END EMAIL ---\n");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddress, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Failed to send email via Resend:", res.status, body);
    // Deliberately not throwing — a failed reset email shouldn't surface a
    // 500 to the client and shouldn't reveal delivery status either (see
    // the "always return generic success" pattern in forgotPassword below).
  }
}

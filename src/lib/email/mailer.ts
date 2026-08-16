// src/lib/email/mailer.ts
//
// Server-only. Sits alongside security/csrf.ts and security/rateLimiter.ts in
// the layering rules: isomorphic code must never reach for this.
import { Resend } from "resend";

let client: Resend | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (name === "RESEND_API_KEY") {
    console.log("[EMAIL ENV] RESEND_API_KEY exists:", Boolean(value));
  } else {
    console.log(`[EMAIL ENV] ${name}:`, value);
  }
  if (!value) throw new Error(`Missing ${name}. Email cannot be sent.`);
  return value;
}

// A module variable, not globalThis. The nodemailer transport this replaced was
// cached on the global for the same reason connectDB is: a serverless
// invocation gets a fresh module registry but the same global, which is what
// stopped every request opening its own SMTP connection pool. A Resend client
// holds no sockets — it is an API key and a header object wrapped around fetch —
// so there is no pool to protect and nothing worth keeping across invocations.
//
// Still built lazily, for the original reason. db.ts can throw on a missing env
// var at import because nothing works without Mongo, but a missing
// RESEND_API_KEY should not stop the whole app from booting — it should fail the
// one request that tries to send.
function getClient(): Resend {
  return (client ??= new Resend(requiredEnv("RESEND_API_KEY")));
}

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Throws on failure. Callers let it reach their `catch { return serverError() }`.
export async function sendMail({
  to,
  subject,
  html,
  text,
}: OutgoingMail): Promise<void> {
  // The one thing to know about this SDK: emails.send() *resolves* with
  // `{ data: null, error }` for anything the API refuses — bad key, unverified
  // sender, quota, suppressed recipient. It does not throw. Only a transport
  // level failure (DNS, socket) rejects.
  //
  // So this check is what keeps the whole sendMail/sendMailSafe split honest.
  // Without it every refused message would look like a success: sendMail would
  // stop throwing, resend-verification would answer 200 and charge the budget
  // for mail that never left, and user/password would tell the user to go and
  // read a confirmation link that was never delivered.
  const { error } = await getClient().emails.send({
    from: requiredEnv("EMAIL_FROM"),
    to,
    subject,
    html,
    text,
  });
  if (error)
    throw new Error(
      `Resend rejected the message: ${error.name} — ${error.message}`,
    );
}

// For the two routes whose whole point is that the caller cannot tell whether
// an account exists: auth/register and auth/forgot-password. Both branch on
// something secret and send different mail (or none) as a result, so if a send
// failure could surface as a 500 on one branch only, the enumeration oracle
// reopens through the error path — the caller just has to break delivery, or
// watch for the address that happens to bounce.
//
// The failure is therefore swallowed and logged loudly instead. A genuinely
// broken mail provider is a server problem to read in the logs, not a signal to
// hand the client.
export async function sendMailSafe(mail: OutgoingMail): Promise<void> {
  try {
    await sendMail(mail);
  } catch (err) {
    console.error("[sendMailSafe] delivery failed", err);
  }
}

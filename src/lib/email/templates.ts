// src/lib/email/templates.ts
//
// Pure: no transport, no database, no request. Each function returns the three
// parts sendMail needs, which is what makes them straightforward to assert on.
import {
  EMAIL_VERIFY_TTL_MS,
  PASSWORD_CHANGE_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from '@/shared/schemas/auth'

// Reuses the origin csrf.ts already trusts rather than introducing a second
// source of truth for "where does this app live".
function appUrl(path: string, token?: string): string {
  const base = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  return token ? `${base}${path}?token=${encodeURIComponent(token)}` : `${base}${path}`
}

function hours(ms: number): string {
  const h = Math.round(ms / (60 * 60 * 1000))
  return h === 1 ? '1 hour' : `${h} hours`
}

// Emails render in clients with no <style> support and no external requests, so
// everything is inline and there are no images.
function layout(heading: string, body: string, cta?: { href: string; label: string }): string {
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
  <h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
  ${body}
  ${
    cta
      ? `<p style="margin:24px 0">
           <a href="${cta.href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600">${cta.label}</a>
         </p>
         <p style="font-size:13px;color:#71717a;margin:16px 0 0">
           If the button does not work, paste this into your browser:<br>
           <span style="word-break:break-all">${cta.href}</span>
         </p>`
      : ''
  }
  <p style="font-size:13px;color:#71717a;margin-top:24px;border-top:1px solid #e4e4e7;padding-top:16px">Job Tracker</p>
</div>`.trim()
}

export interface EmailContent {
  subject: string
  html: string
  text: string
}

export function verifyEmail(name: string, token: string): EmailContent {
  const href = appUrl('/verify-email', token)
  return {
    subject: 'Verify your email',
    html: layout(
      `Welcome, ${name}`,
      `<p style="margin:0;line-height:1.6">Confirm this address to finish setting up your Job Tracker account. This link expires in ${hours(EMAIL_VERIFY_TTL_MS)}.</p>`,
      { href, label: 'Verify email' }
    ),
    text: `Welcome, ${name}\n\nConfirm this address to finish setting up your Job Tracker account:\n${href}\n\nThis link expires in ${hours(EMAIL_VERIFY_TTL_MS)}.`,
  }
}

export function passwordReset(name: string, token: string): EmailContent {
  const href = appUrl('/reset-password', token)
  return {
    subject: 'Reset your password',
    html: layout(
      `Reset your password`,
      `<p style="margin:0;line-height:1.6">Hi ${name}, use the link below to choose a new password. It expires in ${hours(PASSWORD_RESET_TTL_MS)}.</p>
       <p style="margin:12px 0 0;line-height:1.6">If you did not ask for this, you can ignore this email — your password will not change.</p>`,
      { href, label: 'Choose a new password' }
    ),
    text: `Hi ${name},\n\nUse this link to choose a new password:\n${href}\n\nIt expires in ${hours(PASSWORD_RESET_TTL_MS)}. If you did not ask for this, ignore this email — your password will not change.`,
  }
}

export function passwordChangeConfirm(name: string, token: string): EmailContent {
  const href = appUrl('/confirm-password-change', token)
  return {
    subject: 'Confirm your password change',
    html: layout(
      'Confirm your password change',
      `<p style="margin:0;line-height:1.6">Hi ${name}, someone signed in to your account asked to change your password. <strong>It has not changed yet</strong> — confirm below to apply it. This link expires in ${hours(PASSWORD_CHANGE_TTL_MS)}.</p>
       <p style="margin:12px 0 0;line-height:1.6">If this was not you, ignore this email and change your password from a device you trust.</p>`,
      { href, label: 'Confirm change' }
    ),
    text: `Hi ${name},\n\nSomeone signed in to your account asked to change your password. It has NOT changed yet — confirm with this link to apply it:\n${href}\n\nExpires in ${hours(PASSWORD_CHANGE_TTL_MS)}. If this was not you, ignore this email and change your password from a device you trust.`,
  }
}

// Sent when someone registers with an address that already has an account.
// Carries no token and no link that acts on the account: the recipient may be
// a stranger who mistyped their own address, so this must not be actionable.
export function accountExists(name: string): EmailContent {
  const href = appUrl('/login')
  return {
    subject: 'You already have a Job Tracker account',
    html: layout(
      'You already have an account',
      `<p style="margin:0;line-height:1.6">Hi ${name}, someone just tried to register with this email address. An account already exists, so we did not create a second one.</p>
       <p style="margin:12px 0 0;line-height:1.6">If that was you, sign in instead — and use "Forgot password?" on the sign-in page if you cannot remember it.</p>`,
      { href, label: 'Go to sign in' }
    ),
    text: `Hi ${name},\n\nSomeone just tried to register with this email address. An account already exists, so we did not create a second one.\n\nIf that was you, sign in instead: ${href}\nUse "Forgot password?" there if you cannot remember it.`,
  }
}

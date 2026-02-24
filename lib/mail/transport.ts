import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST
const port = Number(process.env.SMTP_PORT || 465)
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS
const from = process.env.MAIL_FROM || 'BloodConnect <noreply@example.com>'

if (!host || !port || !user || !pass) {
  // eslint-disable-next-line no-console
  console.warn('SMTP env vars are missing. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
}

export const mailer = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for other ports
  auth: { user, pass }
})

export async function sendVerificationEmail(to: string, code: string) {
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
      <h2>Verify your email</h2>
      <p>Use this code to complete your signup for <strong>BloodConnect</strong>.</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:0.2em;background:#0f172a;color:white;display:inline-block;padding:8px 12px;border-radius:8px">${code}</p>
      <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `
  await mailer.sendMail({ to, from, subject: 'Your BloodConnect verification code', html })
}

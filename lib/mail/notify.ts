import { mailer } from './transport'

const from = process.env.MAIL_FROM || 'BloodConnect <noreply@example.com>'

export async function sendNotificationEmail(to: string | string[], subject: string, html: string) {
  if (!to || (Array.isArray(to) && to.length === 0)) return
  try {
    await mailer.sendMail({ to, from, subject, html })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Email send failed', e)
  }
}

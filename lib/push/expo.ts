type ExpoMessage = {
  to: string
  title?: string
  body?: string
  data?: any
}

export async function sendExpoPush(messages: ExpoMessage[]) {
  if (!messages.length) return { ok: true }
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages)
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      // eslint-disable-next-line no-console
      console.warn('Expo push failed', res.status, text)
      return { ok: false }
    }
    return { ok: true }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Expo push error', e)
    return { ok: false }
  }
}

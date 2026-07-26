import 'server-only'

/**
 * 텔레그램으로 메시지를 보낸다. TELEGRAM_BOT_TOKEN/CHAT_ID 가 없으면 조용히 넘어가고,
 * 실패해도 예외를 던지지 않는다 — 알림은 부가 기능이지 주문 성공의 필요조건이 아니다.
 */
export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.error('telegram notify failed', res.status, await res.text())
  } catch (err) {
    console.error('telegram notify failed', err)
  }
}

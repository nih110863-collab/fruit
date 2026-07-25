import 'server-only'

/**
 * 텔레그램으로 사장님에게 알림을 보낸다.
 * 환경변수가 없으면 조용히 넘어가고, 실패해도 절대 주문 자체를 막지 않는다
 * (알림은 부가 기능이지 주문 성공의 필요조건이 아니다).
 */
export async function notifyOwner(text: string): Promise<void> {
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

export function formatOrderMessage(opts: {
  title: string
  nickname: string
  lines: { name: string; qty: number }[]
  total: number
  fulfillment: 'pickup' | 'delivery'
  pickupTime?: string | null
  address?: string | null
  memo?: string | null
}): string {
  const itemsText = opts.lines.map((l) => `- ${l.name} × ${l.qty}`).join('\n')
  const receiveText =
    opts.fulfillment === 'delivery'
      ? `배달 · ${opts.address ?? ''}`
      : `픽업${opts.pickupTime ? ' · ' + opts.pickupTime : ''}`

  return [
    opts.title,
    '',
    `닉네임: ${opts.nickname}`,
    itemsText,
    '',
    `합계: ${opts.total.toLocaleString('ko-KR')}원`,
    `수령: ${receiveText}`,
    opts.memo ? `메모: ${opts.memo}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

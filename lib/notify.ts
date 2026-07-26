import 'server-only'
import { sendNtfy } from './ntfy'
import { sendTelegram } from './telegram'

export function formatOrderMessage(opts: {
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

/**
 * 설정된 모든 채널(ntfy, 텔레그램)로 동시에 알린다.
 * 채널 하나가 설정 안 됐거나 실패해도 나머지는 그대로 시도한다.
 */
export async function notifyOwner(title: string, body: string): Promise<void> {
  await Promise.allSettled([sendNtfy(title, body), sendTelegram(`${title}\n\n${body}`)])
}

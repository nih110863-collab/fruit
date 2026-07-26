import 'server-only'

/**
 * ntfy.sh(또는 자체 서버)로 사장님 폰에 푸시 알림을 보낸다.
 * 가입도 토큰도 필요 없는 서비스라 텔레그램보다 설정이 훨씬 간단하다 —
 * NTFY_TOPIC 하나만 정하면 되고, 없으면 조용히 넘어간다.
 * JSON 발행 방식을 쓰는 이유: 헤더로 보내면 한글 제목이 깨질 수 있는데
 * JSON 본문은 UTF-8 을 그대로 받아준다.
 */
export async function sendNtfy(title: string, message: string): Promise<void> {
  const topic = process.env.NTFY_TOPIC
  if (!topic) return

  const server = process.env.NTFY_SERVER || 'https://ntfy.sh'

  try {
    const res = await fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, title, message, priority: 4, tags: ['shopping_cart'] }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.error('ntfy notify failed', res.status, await res.text())
  } catch (err) {
    console.error('ntfy notify failed', err)
  }
}

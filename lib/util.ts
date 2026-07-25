/** 서버가 UTC로 돌아가므로 한국 날짜는 직접 계산한다. */
export function todayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

/** 지금 한국 시간을 'HH:MM' 로. 주문 마감 시각과 문자열로 바로 비교할 수 있다. */
export function nowTimeKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(11, 16)
}

/** 오늘(KST) 기준 n일 전 날짜. n=0 이면 오늘. */
export function daysAgoKST(n: number): string {
  return new Date(Date.now() + 9 * 3600 * 1000 - n * 86400 * 1000).toISOString().slice(0, 10)
}

/** 이번 달 1일(KST). */
export function monthStartKST(): string {
  return `${todayKST().slice(0, 7)}-01`
}

export function formatDate(d: string | Date): string {
  const s = typeof d === 'string' ? d : d.toISOString().slice(0, 10)
  const [y, m, day] = s.slice(0, 10).split('-')
  const week = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(`${s.slice(0, 10)}T00:00:00Z`).getUTCDay()
  ]
  return `${y}.${m}.${day} (${week})`
}

/** DATE 컬럼은 드라이버가 Date 객체로 줄 수도, 문자열로 줄 수도 있다. */
export function toDateString(v: unknown): string {
  if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

export function won(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

export function normalizeNickname(v: string): string {
  return v.trim().replace(/\s+/g, ' ')
}

export function normalizeLast4(v: string): string {
  return v.replace(/\D/g, '').slice(-4)
}

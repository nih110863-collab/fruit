import type { DailyItem, Highlight } from './types'

/**
 * 특별 구역에 넣을 품목 고르기.
 * 타임세일은 이미 끝난 것을 빼서, 지난 세일이 계속 붙어 있지 않게 한다.
 */
export function pickSection(items: DailyItem[], key: Highlight): DailyItem[] {
  return items.filter((item) => {
    if (item.highlight !== key) return false
    if (key === 'timesale') return item.sale_active || item.sale_upcoming
    return true
  })
}

export function categoriesOf(items: DailyItem[]): string[] {
  const seen: string[] = []
  for (const item of items) {
    const c = item.category?.trim()
    if (c && !seen.includes(c)) seen.push(c)
  }
  return seen
}

export function matches(item: DailyItem, query: string, category: string): boolean {
  if (category && item.category?.trim() !== category) return false
  const q = query.trim()
  if (!q) return true
  return item.name.includes(q) || (item.category ?? '').includes(q)
}

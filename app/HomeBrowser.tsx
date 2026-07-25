'use client'

import { useMemo, useState } from 'react'
import ItemCard from '@/components/ItemCard'
import ItemFilters from '@/components/ItemFilters'
import OrderFeedTicker from '@/components/OrderFeedTicker'
import { categoriesOf, matches, pickSection } from '@/lib/sections'
import { HIGHLIGHTS, type DailyItem, type FeedItem } from '@/lib/types'

/** 첫 화면(로그인 전) 품목 진열 — 보기 전용 */
export default function HomeBrowser({ items, feedItems }: { items: DailyItem[]; feedItems: FeedItem[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const categories = useMemo(() => categoriesOf(items), [items])
  const filtering = Boolean(query.trim() || category)
  const visible = useMemo(
    () => items.filter((item) => matches(item, query, category)),
    [items, query, category],
  )

  const grid = (list: DailyItem[]) => (
    <ul className="grid grid-cols-3 gap-2">
      {list.map((item) => (
        <li key={item.id}>
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-6">
      <OrderFeedTicker items={feedItems} />

      {!filtering &&
        HIGHLIGHTS.map((h) => {
          const picked = pickSection(items, h.key)
          if (!picked.length) return null
          return (
            <section key={h.key}>
              <h2 className="mb-2 text-base font-bold">{h.title}</h2>
              {grid(picked)}
            </section>
          )
        })}

      <section className="space-y-3">
        <ItemFilters
          categories={categories}
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          count={visible.length}
        />
        {visible.length > 0 ? (
          grid(visible)
        ) : (
          <p className="rounded-xl bg-stone-100 px-4 py-8 text-center text-sm text-stone-500">
            찾는 품목이 없습니다.
          </p>
        )}
      </section>
    </div>
  )
}

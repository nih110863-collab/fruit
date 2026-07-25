'use client'

import { useEffect, useState } from 'react'
import type { FeedItem } from '@/lib/types'

/** "방금 사과 담겼어요" 처럼 누가 샀는지는 빼고 품목만 한 줄씩 돌아가며 보여주는 롤링 알림. */
export default function OrderFeedTicker({ items }: { items: FeedItem[] }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(() => setI((v) => (v + 1) % items.length), 2800)
    return () => clearInterval(timer)
  }, [items.length])

  if (items.length === 0) return null
  const item = items[i % items.length]

  return (
    <div className="mb-4 overflow-hidden rounded-xl bg-brand-50 px-3.5 py-2.5">
      <p key={i} className="animate-toast-in truncate text-xs font-semibold text-brand-700">
        🛒 방금 {item.product_name}
        {item.qty > 1 ? ` ${item.qty}개` : ''} 담겼어요
      </p>
    </div>
  )
}

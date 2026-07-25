'use client'

import { useEffect } from 'react'
import { won } from '@/lib/util'
import type { DailyItem } from '@/lib/types'

/** 담은 품목을 한눈에 보여주는 바텀시트 — 여기서 바로 수량을 고칠 수도 있다. */
export default function CartSheet({
  items,
  qtys,
  total,
  onChange,
  onClose,
}: {
  items: DailyItem[]
  qtys: Record<number, number>
  total: number
  onChange: (item: DailyItem, delta: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const lines = items.map((item) => ({ item, qty: qtys[item.id] ?? 0 })).filter((l) => l.qty > 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-stone-900/50" />

      <div className="relative flex max-h-[80dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
          <h2 className="text-base font-bold">담은 품목{lines.length > 0 && ` (${lines.length})`}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 size-8 rounded-lg text-xl leading-none text-stone-400 hover:bg-stone-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {lines.length === 0 ? (
            <p className="rounded-xl bg-stone-100 px-4 py-8 text-center text-sm text-stone-500">
              아직 담은 품목이 없어요.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {lines.map(({ item, qty }) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-stone-500">
                      {won(item.effective_price)} × {qty}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChange(item, -1)}
                      aria-label={`${item.name} 수량 줄이기`}
                      className="size-8 rounded-lg border border-stone-300 text-base font-bold text-stone-600"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => onChange(item, 1)}
                      disabled={item.remaining !== null && qty >= item.remaining}
                      aria-label={`${item.name} 수량 늘리기`}
                      className="size-8 rounded-lg border border-brand-500 bg-brand-50 text-base font-bold text-brand-700 disabled:border-stone-300 disabled:bg-white disabled:text-stone-300"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums">
                    {won(item.effective_price * qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-stone-100 px-5 py-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-stone-500">합계</span>
            <span className="text-xl font-bold">{won(total)}</span>
          </div>
          <button type="button" onClick={onClose} className="btn-primary w-full">
            계속 담기
          </button>
        </div>
      </div>
    </div>
  )
}

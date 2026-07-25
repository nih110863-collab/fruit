'use client'

import { useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { won } from '@/lib/util'
import type { DailyItem } from '@/lib/types'

function ConfirmButton({ onConfirm, isEdit }: { onConfirm: () => void; isEdit: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="button" onClick={onConfirm} disabled={pending} className="btn-primary w-full">
      {pending ? '저장하는 중…' : isEdit ? '네, 수정할게요' : '네, 주문할게요'}
    </button>
  )
}

/** 주문 접수 직전 마지막 확인 화면 — 담은 품목·수령방법·금액을 한 번 더 보여준다. */
export default function OrderConfirmModal({
  items,
  qtys,
  total,
  fulfillment,
  pickupTime,
  address,
  memo,
  isEdit,
  onConfirm,
  onClose,
}: {
  items: DailyItem[]
  qtys: Record<number, number>
  total: number
  fulfillment: 'pickup' | 'delivery'
  pickupTime: string
  address: string
  memo: string
  isEdit: boolean
  onConfirm: () => void
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
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-stone-900/50" />

      <div className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="px-5 pb-1 pt-5 text-center">
          <h2 className="text-lg font-bold">{isEdit ? '수정내역이 맞습니까?' : '주문내역이 맞습니까?'}</h2>
          <p className="mt-1 text-xs text-stone-500">
            확인하시면 바로 {isEdit ? '수정 내용이 저장됩니다.' : '주문이 접수됩니다.'}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="divide-y divide-stone-100">
            {lines.map(({ item, qty }) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {item.name} <span className="text-stone-400">× {qty}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {won(item.effective_price * qty)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 text-sm text-stone-600">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-stone-400">받는 방법</dt>
              <dd className="font-medium text-stone-800">
                {fulfillment === 'delivery' ? '배달' : '가게 픽업'}
              </dd>
            </div>
            {fulfillment === 'pickup' && pickupTime && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-stone-400">픽업 시간</dt>
                <dd>{pickupTime}</dd>
              </div>
            )}
            {fulfillment === 'delivery' && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-stone-400">배달 주소</dt>
                <dd className="min-w-0 flex-1">{address}</dd>
              </div>
            )}
            {memo && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-stone-400">메모</dt>
                <dd className="min-w-0 flex-1 font-medium text-amber-700">{memo}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="space-y-2.5 border-t border-stone-100 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-stone-500">합계</span>
            <span className="text-xl font-bold">{won(total)}</span>
          </div>
          <ConfirmButton onConfirm={onConfirm} isEdit={isEdit} />
          <button type="button" onClick={onClose} className="btn-ghost w-full">
            다시 확인할게요
          </button>
        </div>
      </div>
    </div>
  )
}

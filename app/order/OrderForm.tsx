'use client'

import { useMemo, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { placeOrder, type FormState } from '../actions'
import { won } from '@/lib/util'
import type { DailyItem } from '@/lib/types'

function SubmitButton({ total, count }: { total: number; count: number }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending || count === 0}>
      {pending ? '주문 넣는 중…' : count === 0 ? '품목을 담아주세요' : `${won(total)} 주문하기`}
    </button>
  )
}

export default function OrderForm({
  items,
  defaultAddress,
}: {
  items: DailyItem[]
  defaultAddress: string
}) {
  const [state, formAction] = useActionState<FormState, FormData>(placeOrder, {})
  const [qtys, setQtys] = useState<Record<number, number>>({})
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')

  const lines = useMemo(
    () =>
      Object.entries(qtys)
        .map(([id, qty]) => ({ dailyItemId: Number(id), qty }))
        .filter((l) => l.qty > 0),
    [qtys],
  )

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const item = items.find((i) => i.id === l.dailyItemId)
        return sum + (item ? item.price * l.qty : 0)
      }, 0),
    [lines, items],
  )

  function bump(item: DailyItem, delta: number) {
    setQtys((prev) => {
      const current = prev[item.id] ?? 0
      const max = item.remaining === null ? 99 : Math.min(99, item.remaining)
      const next = Math.max(0, Math.min(max, current + delta))
      return { ...prev, [item.id]: next }
    })
  }

  return (
    <form action={formAction} className="pb-40">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <ul className="divide-y divide-stone-100">
        {items.map((item) => {
          const qty = qtys[item.id] ?? 0
          const soldOut = item.remaining === 0
          return (
            <li key={item.id} className="flex items-center gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`truncate font-semibold ${soldOut ? 'text-stone-400 line-through' : ''}`}
                  >
                    {item.name}
                  </span>
                  {soldOut && (
                    <span className="badge shrink-0 bg-stone-200 text-stone-600">마감</span>
                  )}
                  {!soldOut && item.remaining !== null && item.remaining <= 5 && (
                    <span className="badge shrink-0 bg-amber-100 text-amber-800">
                      {item.remaining}
                      {item.unit} 남음
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-stone-500">
                  {won(item.price)} / {item.unit}
                  {item.limit_qty !== null && !soldOut && (
                    <span className="ml-1.5 text-xs text-stone-400">한정 {item.limit_qty}{item.unit}</span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => bump(item, -1)}
                  disabled={qty === 0}
                  aria-label={`${item.name} 수량 줄이기`}
                  className="size-9 rounded-lg border border-stone-300 text-lg font-bold text-stone-600 disabled:opacity-30"
                >
                  −
                </button>
                <span
                  className={`w-9 text-center text-base font-bold tabular-nums ${
                    qty > 0 ? 'text-brand-700' : 'text-stone-300'
                  }`}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => bump(item, 1)}
                  disabled={soldOut || (item.remaining !== null && qty >= item.remaining)}
                  aria-label={`${item.name} 수량 늘리기`}
                  className="size-9 rounded-lg border border-brand-500 bg-brand-50 text-lg font-bold text-brand-700 disabled:border-stone-300 disabled:bg-white disabled:text-stone-300"
                >
                  +
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 space-y-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <div>
          <span className="label">받는 방법</span>
          <div className="grid grid-cols-2 gap-2">
            {(['pickup', 'delivery'] as const).map((mode) => (
              <label
                key={mode}
                className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                  fulfillment === mode
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-stone-300 bg-white text-stone-500'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value={mode}
                  checked={fulfillment === mode}
                  onChange={() => setFulfillment(mode)}
                  className="sr-only"
                />
                {mode === 'pickup' ? '가게에서 픽업' : '배달'}
              </label>
            ))}
          </div>
        </div>

        {fulfillment === 'pickup' ? (
          <div>
            <label className="label" htmlFor="pickup_time">
              픽업 희망 시간 <span className="font-normal text-stone-400">(선택)</span>
            </label>
            <input
              id="pickup_time"
              name="pickup_time"
              className="input"
              placeholder="예) 오후 6시쯤"
              maxLength={30}
            />
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="address">
              배달 주소
            </label>
            <input
              id="address"
              name="address"
              className="input"
              defaultValue={defaultAddress}
              placeholder="예) 행복아파트 101동 1503호"
              maxLength={120}
              required
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="memo">
            메모 <span className="font-normal text-stone-400">(선택)</span>
          </label>
          <input
            id="memo"
            name="memo"
            className="input"
            placeholder="예) 대파는 반단만 주세요"
            maxLength={200}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 px-5 pb-6 pt-4 backdrop-blur">
        <div className="mx-auto max-w-md space-y-2.5">
          {state.error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {state.error}
            </p>
          )}
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-stone-500">
              {lines.length > 0 ? `${lines.length}가지 담음` : '담은 품목 없음'}
            </span>
            <span className="text-lg font-bold">{won(total)}</span>
          </div>
          <SubmitButton total={total} count={lines.length} />
        </div>
      </div>
    </form>
  )
}

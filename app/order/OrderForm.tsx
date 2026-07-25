'use client'

import { useMemo, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { placeOrder, type FormState } from '../actions'
import ProductImage from '@/components/ProductImage'
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

      <ul className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const qty = qtys[item.id] ?? 0
          const soldOut = item.remaining === 0
          // 담은 만큼 즉시 줄여서 보여준다 (수량 제한이 없으면 null)
          const left = item.remaining === null ? null : Math.max(0, item.remaining - qty)
          return (
            <li
              key={item.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                qty > 0 ? 'border-brand-500 ring-1 ring-brand-500' : 'border-stone-200'
              }`}
            >
              <div className="relative">
                <ProductImage
                  productId={item.product_id}
                  version={item.image_version}
                  hasImage={item.has_image}
                  name={item.name}
                  className="aspect-square w-full"
                  sizes="(max-width: 448px) 45vw, 200px"
                />

                {soldOut && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/45">
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-stone-700">
                      오늘 마감
                    </span>
                  </div>
                )}

                {!soldOut && item.limit_qty !== null && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-stone-600 shadow">
                    한정 {item.limit_qty}
                    {item.unit}
                  </span>
                )}

                {qty > 0 && (
                  <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow">
                    {qty}
                  </span>
                )}
              </div>

              <div className="p-2.5">
                <p
                  className={`truncate text-sm font-bold ${soldOut ? 'text-stone-400' : 'text-stone-900'}`}
                >
                  {item.name}
                </p>
                <p className="mt-0.5 text-sm text-stone-500">
                  <span className="font-semibold text-stone-800">
                    {item.price.toLocaleString('ko-KR')}원
                  </span>{' '}
                  / {item.unit}
                </p>

                {/* 수량 제한 품목은 담는 만큼 남은 개수가 오른쪽에서 줄어든다 */}
                <div className="mt-1 flex h-5 items-center justify-end">
                  {left !== null && (
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        left === 0
                          ? 'text-stone-400'
                          : left <= 3
                            ? 'text-amber-600'
                            : 'text-stone-500'
                      }`}
                    >
                      {left === 0 ? (
                        qty > 0 ? '남은 수량 없음' : '마감'
                      ) : (
                        <>
                          남은 수량 {left}
                          {item.unit}
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between gap-1">
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
                    className={`min-w-6 text-center text-base font-bold tabular-nums ${
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

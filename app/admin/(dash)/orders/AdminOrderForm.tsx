'use client'

import { useMemo, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { adminSaveOrder, type FormState } from '../../actions'
import ProductImage from '@/components/ProductImage'
import { won } from '@/lib/util'
import type { DailyItem, Order } from '@/lib/types'

type CustomerOption = { id: number; nickname: string; phone_last4: string; address: string | null }

function SubmitButton({ isEdit, total }: { isEdit: boolean; total: number }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? '저장 중…' : `${won(total)} ${isEdit ? '수정 저장' : '주문 넣기'}`}
    </button>
  )
}

export default function AdminOrderForm({
  saleDate,
  items,
  customers,
  order,
  initialCustomer,
}: {
  saleDate: string
  items: DailyItem[]
  customers: CustomerOption[]
  order?: Order
  initialCustomer?: CustomerOption
}) {
  const isEdit = Boolean(order)
  const [state, formAction] = useActionState<FormState, FormData>(adminSaveOrder, {})

  const [nickname, setNickname] = useState(order?.nickname ?? initialCustomer?.nickname ?? '')
  const [last4, setLast4] = useState(order?.phone_last4 ?? initialCustomer?.phone_last4 ?? '')
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(
    order?.fulfillment ?? 'pickup',
  )
  const [address, setAddress] = useState(order?.address ?? initialCustomer?.address ?? '')
  const [query, setQuery] = useState('')

  const [qtys, setQtys] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {}
    for (const item of items) {
      const match = order?.items?.find(
        (oi) => oi.daily_item_id === item.id || oi.product_id === item.product_id,
      )
      if (match) init[item.id] = match.qty
    }
    return init
  })

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
        return sum + (item ? item.effective_price * l.qty : 0)
      }, 0),
    [lines, items],
  )

  const matches = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return customers
      .filter((c) => c.nickname.includes(q) || c.phone_last4.includes(q))
      .slice(0, 8)
  }, [query, customers])

  function bump(item: DailyItem, delta: number) {
    setQtys((prev) => {
      const current = prev[item.id] ?? 0
      const max = item.remaining === null ? 999 : Math.min(999, item.remaining)
      return { ...prev, [item.id]: Math.max(0, Math.min(max, current + delta)) }
    })
  }

  function pickCustomer(c: CustomerOption) {
    setNickname(c.nickname)
    setLast4(c.phone_last4)
    if (c.address) setAddress(c.address)
    setQuery('')
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="sale_date" value={saleDate} />
      {order && <input type="hidden" name="order_id" value={order.id} />}

      {/* 고객 */}
      <section className="card space-y-3">
        <h2 className="text-sm font-bold text-stone-700">고객</h2>

        {!isEdit && (
          <div>
            <label className="label" htmlFor="customer_search">
              기존 고객 찾기
            </label>
            <input
              id="customer_search"
              className="input"
              placeholder="닉네임 또는 뒷자리로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {matches.length > 0 && (
              <ul className="mt-1.5 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-stone-50"
                    >
                      <span className="font-medium">{c.nickname}</span>
                      <span className="text-stone-400">{c.phone_last4}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="nickname">
              닉네임
            </label>
            <input
              id="nickname"
              name="nickname"
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예) 301호 민지엄마"
              maxLength={20}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="phone_last4">
              휴대폰 뒷 4자리
            </label>
            <input
              id="phone_last4"
              name="phone_last4"
              className="input tracking-[0.3em]"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
              maxLength={4}
              required
            />
          </div>
        </div>
        <p className="text-xs text-stone-500">
          없는 고객이면 자동으로 새로 등록됩니다.
        </p>
      </section>

      {/* 품목 */}
      <section className="card">
        <h2 className="mb-1 text-sm font-bold text-stone-700">품목</h2>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            이 날짜에 올라간 판매 품목이 없습니다. 먼저 판매목록을 짜주세요.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {items.map((item) => {
              const qty = qtys[item.id] ?? 0
              const soldOut = item.remaining === 0
              const left = item.remaining === null ? null : Math.max(0, item.remaining - qty)
              return (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <ProductImage
                    productId={item.product_id}
                    version={item.image_version}
                    hasImage={item.has_image}
                    name={item.name}
                    className="size-12 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate font-semibold ${soldOut ? 'text-stone-400' : ''}`}>
                        {item.name}
                      </span>
                      {left !== null && (
                        <span
                          className={`badge shrink-0 tabular-nums ${
                            left === 0 ? 'bg-stone-200 text-stone-600' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {left === 0 ? '남은 수량 없음' : `${left}개 남음`}
                        </span>
                      )}
                      {!item.is_active && (
                        <span className="badge shrink-0 bg-stone-200 text-stone-600">숨김</span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500">
                      {item.sale_active && (
                        <span className="mr-1 text-xs text-stone-400 line-through">
                          {item.price.toLocaleString('ko-KR')}
                        </span>
                      )}
                      <span className={item.sale_active ? 'font-semibold text-red-600' : ''}>
                        {won(item.effective_price)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => bump(item, -1)}
                      disabled={qty === 0}
                      className="size-9 rounded-lg border border-stone-300 text-lg font-bold text-stone-600 disabled:opacity-30"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={qty}
                      min={0}
                      onChange={(e) =>
                        setQtys((prev) => ({
                          ...prev,
                          [item.id]: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-12 rounded-lg border border-stone-200 py-1.5 text-center text-base font-bold tabular-nums"
                      aria-label={`${item.name} 수량`}
                    />
                    <button
                      type="button"
                      onClick={() => bump(item, 1)}
                      className="size-9 rounded-lg border border-brand-500 bg-brand-50 text-lg font-bold text-brand-700"
                    >
                      +
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 수령 정보 */}
      <section className="card space-y-4">
        <h2 className="text-sm font-bold text-stone-700">수령 정보</h2>

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
              {mode === 'pickup' ? '픽업' : '배달'}
            </label>
          ))}
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
              defaultValue={order?.pickup_time ?? ''}
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
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
            defaultValue={order?.memo ?? ''}
            placeholder="예) 대파는 반단만"
            maxLength={200}
          />
        </div>

        {!isEdit && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" name="mark_paid" className="size-4 accent-emerald-700" />
            지금 입금(결제) 받음으로 표시
          </label>
        )}
      </section>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <SubmitButton isEdit={isEdit} total={total} />
      </div>
    </form>
  )
}

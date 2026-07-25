'use client'

import { useActionState, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { placeOrder, type FormState } from '../actions'
import ItemCard from '@/components/ItemCard'
import ItemFilters from '@/components/ItemFilters'
import { categoriesOf, matches, pickSection } from '@/lib/sections'
import { HIGHLIGHTS, type DailyItem } from '@/lib/types'
import { won } from '@/lib/util'

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
  initialQtys,
  reorderNotice,
}: {
  items: DailyItem[]
  defaultAddress: string
  /** "다시 담기"로 들어왔을 때 미리 채울 수량 (dailyItemId → qty) */
  initialQtys?: Record<number, number>
  /** 다시 담기 결과 안내 문구 (제외된 품목이 있으면 함께 알려줌) */
  reorderNotice?: string
}) {
  const [state, formAction] = useActionState<FormState, FormData>(placeOrder, {})
  const [qtys, setQtys] = useState<Record<number, number>>(() => initialQtys ?? {})
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const categories = useMemo(() => categoriesOf(items), [items])
  const filtering = Boolean(query.trim() || category)
  const visible = useMemo(
    () => items.filter((item) => matches(item, query, category)),
    [items, query, category],
  )

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

  function bump(item: DailyItem, delta: number) {
    setQtys((prev) => {
      const current = prev[item.id] ?? 0
      const max = item.remaining === null ? 99 : Math.min(99, item.remaining)
      return { ...prev, [item.id]: Math.max(0, Math.min(max, current + delta)) }
    })
  }

  const grid = (list: DailyItem[]) => (
    <ul className="grid grid-cols-3 gap-2">
      {list.map((item) => (
        <li key={item.id}>
          <ItemCard item={item} qty={qtys[item.id] ?? 0} onChange={(d) => bump(item, d)} />
        </li>
      ))}
    </ul>
  )

  return (
    <form action={formAction} className="space-y-6 pb-40">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {reorderNotice && (
        <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-700">
          {reorderNotice}
        </p>
      )}

      {/* 사장님이 지정한 특별 구역 — 검색/분류 중일 때는 방해되지 않게 숨긴다 */}
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
        <h2 className="text-base font-bold">전체 품목</h2>
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

      <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
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

'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import MoneyInput from '@/components/MoneyInput'
import ProductImage from '@/components/ProductImage'
import {
  clearDailyItemLimit,
  removeDailyItem,
  reorderDailyItems,
  toggleDailyItem,
  updateDailyItem,
} from '../../actions'
import { ItemCheckbox } from './SaleToolbar'
import { HIGHLIGHTS } from '@/lib/types'
import type { DailyItem } from '@/lib/types'
import { won } from '@/lib/util'

function DragHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}) {
  return (
    <button
      type="button"
      aria-label="드래그해서 순서 바꾸기"
      className="flex shrink-0 touch-none items-center self-stretch px-0.5 text-stone-300 active:cursor-grabbing active:text-stone-500"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5" aria-hidden="true">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  )
}

/** 판매목록 한 줄. 드래그 핸들을 누른 채 위아래로 옮기면 순서가 바로 바뀐다. */
export default function DailyItemsList({ items }: { items: DailyItem[] }) {
  const [order, setOrder] = useState(items)
  const dragIndex = useRef<number | null>(null)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])

  // 세일 적용 등 다른 액션으로 서버 데이터가 새로 내려오면 그대로 반영
  useEffect(() => setOrder(items), [items])

  function handlePointerDown(e: React.PointerEvent, index: number) {
    dragIndex.current = index
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragIndex.current === null) return
    const y = e.clientY
    let overIndex = dragIndex.current
    rowRefs.current.forEach((el, i) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (y > rect.top && y < rect.bottom) overIndex = i
    })
    if (overIndex !== dragIndex.current) {
      const from = dragIndex.current
      setOrder((prev) => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(overIndex, 0, moved)
        return next
      })
      dragIndex.current = overIndex
    }
  }

  function handlePointerUp() {
    if (dragIndex.current === null) return
    dragIndex.current = null
    const ids = order.map((it) => it.id)
    startTransition(() => {
      reorderDailyItems(ids)
    })
  }

  return (
    <ul className="mt-3 space-y-2">
      {order.map((it, index) => (
        <li
          key={it.id}
          ref={(el) => {
            rowRefs.current[index] = el
          }}
          className={`card ${it.is_active ? '' : 'opacity-60'}`}
        >
          <div className="flex items-start gap-2">
            <DragHandle
              onPointerDown={(e) => handlePointerDown(e, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />

            <div className="flex shrink-0 items-center pt-4">
              <ItemCheckbox id={it.id} label={it.name} />
            </div>

            <ProductImage
              productId={it.product_id}
              version={it.image_version}
              hasImage={it.has_image}
              name={it.name}
              className="size-12 shrink-0 rounded-lg"
            />

            <div className="min-w-0 flex-1 basis-32">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="truncate font-bold">{it.name}</span>
                {!it.is_active && <span className="badge bg-stone-200 text-stone-600">숨김</span>}
                {it.limit_qty !== null && (
                  <span
                    className={`badge ${
                      it.remaining === 0 ? 'bg-stone-200 text-stone-600' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {it.remaining === 0 ? '마감' : `${it.remaining}개 남음`}
                  </span>
                )}
                {it.remaining === 0 && (
                  <form action={clearDailyItemLimit}>
                    <input type="hidden" name="id" value={it.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-brand-300 px-2 py-0.5 text-[11px] font-bold text-brand-700 hover:bg-brand-50"
                      title="수량 제한을 없애 무제한으로 바꿉니다"
                    >
                      무제한으로 풀기
                    </button>
                  </form>
                )}
                {it.sale_price && (
                  <span className="badge bg-red-100 text-red-700">
                    세일 {won(it.sale_price)}
                    {it.sale_from && ` ${it.sale_from}~${it.sale_to ?? ''}`}
                  </span>
                )}
                {it.highlight && (
                  <span className="badge bg-brand-100 text-brand-700">
                    {HIGHLIGHTS.find((h) => h.key === it.highlight)?.label}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-stone-500">주문됨 {it.ordered_qty}개</p>
            </div>

            <form action={updateDailyItem} className="flex shrink-0 items-end gap-1.5">
              <input type="hidden" name="id" value={it.id} />
              <label className="w-20">
                <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">정가</span>
                <MoneyInput
                  name="price"
                  className="input px-2 py-1.5 text-sm"
                  defaultValue={it.price}
                />
              </label>
              <label className="w-16">
                <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">제한</span>
                <MoneyInput
                  name="limit_qty"
                  className="input px-2 py-1.5 text-sm"
                  placeholder="무제한"
                  defaultValue={it.limit_qty ?? ''}
                />
              </label>
              <button type="submit" className="btn-ghost btn-sm px-2.5">
                저장
              </button>
            </form>

            <div className="flex shrink-0 gap-1">
              <form action={toggleDailyItem}>
                <input type="hidden" name="id" value={it.id} />
                <button type="submit" className="btn-ghost btn-sm px-2">
                  {it.is_active ? '숨김' : '보임'}
                </button>
              </form>
              <form action={removeDailyItem}>
                <input type="hidden" name="id" value={it.id} />
                <button type="submit" className="btn-ghost btn-sm px-2 text-red-600">
                  품목함으로!
                </button>
              </form>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

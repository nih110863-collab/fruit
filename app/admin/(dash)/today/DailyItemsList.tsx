'use client'

import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import MoneyInput from '@/components/MoneyInput'
import ProductImage from '@/components/ProductImage'
import {
  bulkRemoveDailyItems,
  bulkToggleDailyItems,
  bulkUpdateDailyItems,
  clearDailyItemLimit,
  reorderDailyItems,
} from '../../actions'
import { ItemCheckbox, useSelection } from './SaleToolbar'
import { DEFAULT_CATEGORIES, HIGHLIGHTS } from '@/lib/types'
import type { DailyItem } from '@/lib/types'
import { won } from '@/lib/util'

const UNCATEGORIZED = '미분류'

/** 기본 분류 순서를 먼저, 그 외 분류는 가나다순, 분류 없는 품목은 맨 뒤로 */
function categoryRank(category: string): number {
  if (category === UNCATEGORIZED) return DEFAULT_CATEGORIES.length + 1
  const i = DEFAULT_CATEGORIES.indexOf(category)
  return i === -1 ? DEFAULT_CATEGORIES.length : i
}

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

/**
 * 판매목록 카드 그리드. 드래그 핸들을 누른 채 위아래로 옮기면 순서가 바로 바뀐다.
 * 상단 버튼은 모두 체크한 카드를 대상으로 한다 — '숨김'은 노출 여부를 뒤집고,
 * '품목함 이동'은 오늘 목록에서 내려 품목함으로 돌려보낸다. '저장'만 예외로,
 * 화면에 보이는 모든 카드의 정가·제한수량을 체크 여부와 무관하게 한 번에 저장한다.
 */
export default function DailyItemsList({ items }: { items: DailyItem[] }) {
  const [order, setOrder] = useState(items)
  // id로 관리해야 카테고리별로 다시 묶여 렌더링 순서가 바뀌어도 안정적으로 찾을 수 있다
  const dragId = useRef<number | null>(null)
  const rowRefs = useRef<Map<number, HTMLLIElement>>(new Map())
  const { selected, clear } = useSelection()

  // 세일 적용 등 다른 액션으로 서버 데이터가 새로 내려오면 그대로 반영
  useEffect(() => setOrder(items), [items])

  function handlePointerDown(e: React.PointerEvent, id: number) {
    dragId.current = id
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragId.current === null) return
    const y = e.clientY
    let overId = dragId.current
    rowRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect()
      if (y > rect.top && y < rect.bottom) overId = id
    })
    if (overId !== dragId.current) {
      const draggedId = dragId.current
      setOrder((prev) => {
        const from = prev.findIndex((it) => it.id === draggedId)
        const to = prev.findIndex((it) => it.id === overId)
        if (from === -1 || to === -1) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
      dragId.current = overId
    }
  }

  function handlePointerUp() {
    if (dragId.current === null) return
    dragId.current = null
    const ids = order.map((it) => it.id)
    startTransition(() => {
      reorderDailyItems(ids)
    })
  }

  function handleBulkToggle() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    startTransition(() => {
      bulkToggleDailyItems(ids)
    })
    clear()
  }

  function handleBulkRemove() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    startTransition(() => {
      bulkRemoveDailyItems(ids)
    })
    clear()
  }

  // 카테고리별로 묶어서 보여준다. 카드는 id로 찾기 때문에, 화면에는 분류별로
  // 나뉘어 보여도 드래그 정렬은 order 배열 자체를 그대로 바꿔서 처리한다.
  const groups = useMemo(() => {
    const byCategory = new Map<string, DailyItem[]>()
    for (const item of order) {
      const category = item.category ?? UNCATEGORIZED
      if (!byCategory.has(category)) byCategory.set(category, [])
      byCategory.get(category)!.push(item)
    }
    return Array.from(byCategory.entries()).sort(
      ([a], [b]) => categoryRank(a) - categoryRank(b),
    )
  }, [order])

  return (
    <form action={bulkUpdateDailyItems} className="mt-4">
      {order.map((it) => (
        <input key={it.id} type="hidden" name="ids" value={it.id} />
      ))}

      <div className="mb-2 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={handleBulkToggle}
          disabled={selected.size === 0}
          className="btn-ghost btn-sm disabled:opacity-40"
        >
          숨김
        </button>
        <button
          type="button"
          onClick={handleBulkRemove}
          disabled={selected.size === 0}
          className="btn-ghost btn-sm text-red-600 disabled:opacity-40"
        >
          품목함 이동
        </button>
        <button type="submit" className="btn-primary btn-sm">
          저장
        </button>
      </div>

      <div className="space-y-4">
        {groups.map(([category, entries]) => (
          <div key={category}>
            <h3 className="mb-2 text-xs font-bold text-stone-500">
              {category} ({entries.length}개)
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {entries.map((it) => (
                <li
                  key={it.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(it.id, el)
                    else rowRefs.current.delete(it.id)
                  }}
                  className={`card ${it.is_active ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-start gap-2">
                    <DragHandle
                      onPointerDown={(e) => handlePointerDown(e, it.id)}
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

                    <div className="min-w-0 flex-1 basis-24">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="truncate font-bold">{it.name}</span>
                        {!it.is_active && (
                          <span className="badge bg-stone-200 text-stone-600">숨김</span>
                        )}
                        {it.limit_qty !== null && (
                          <span
                            className={`badge ${
                              it.remaining === 0
                                ? 'bg-stone-200 text-stone-600'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {it.remaining === 0 ? '마감' : `${it.remaining}개 남음`}
                          </span>
                        )}
                        {it.remaining === 0 && (
                          <button
                            type="button"
                            onClick={() => startTransition(() => clearDailyItemLimit(it.id))}
                            className="rounded-full border border-brand-300 px-2 py-0.5 text-[11px] font-bold text-brand-700 hover:bg-brand-50"
                            title="수량 제한을 없애 무제한으로 바꿉니다"
                          >
                            무제한으로 풀기
                          </button>
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
                      <p className="mt-0.5 text-xs text-stone-500">{it.ordered_qty}개 주문</p>
                    </div>

                    <div className="flex shrink-0 items-end gap-1.5">
                      <label className="w-20">
                        <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">
                          정가
                        </span>
                        <MoneyInput
                          name={`price_${it.id}`}
                          className="input px-2 py-1.5 text-sm"
                          defaultValue={it.price}
                        />
                      </label>
                      <label className="w-16">
                        <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">
                          제한
                        </span>
                        <MoneyInput
                          name={`limit_qty_${it.id}`}
                          className="input px-2 py-1.5 text-sm"
                          placeholder="무제한"
                          defaultValue={it.limit_qty ?? ''}
                        />
                      </label>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </form>
  )
}

'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { placeOrder, updateMyOrder, type FormState } from '../actions'
import CartSheet from './CartSheet'
import OrderConfirmModal from './OrderConfirmModal'
import ItemCard from '@/components/ItemCard'
import ItemFilters from '@/components/ItemFilters'
import OrderFeedTicker from '@/components/OrderFeedTicker'
import { categoriesOf, matches, pickSection } from '@/lib/sections'
import { HIGHLIGHTS, type DailyItem, type FeedItem } from '@/lib/types'
import { won } from '@/lib/util'

/** '주문하기' 는 곧바로 제출하지 않고 확인 화면을 먼저 연다 */
function ReviewButton({
  total,
  count,
  isEdit,
  closed,
  onClick,
}: {
  total: number
  count: number
  isEdit: boolean
  closed: boolean
  onClick: () => void
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-primary w-full"
      disabled={pending || count === 0 || closed}
    >
      {closed
        ? '오늘 주문 마감'
        : pending
          ? '저장하는 중…'
        : count === 0
          ? '품목을 담아주세요'
          : `${won(total)} ${isEdit ? '수정하기' : '주문하기'}`}
    </button>
  )
}

export type EditOrderInfo = {
  id: number
  fulfillment: 'pickup' | 'delivery'
  pickupTime: string
  address: string
  memo: string
}

export default function OrderForm({
  items,
  defaultAddress,
  initialQtys,
  reorderNotice,
  editOrder,
  feedItems,
  closed,
  cutoffTime,
}: {
  items: DailyItem[]
  defaultAddress: string
  /** 주문 수정으로 들어왔을 때 미리 채울 수량 (dailyItemId → qty) */
  initialQtys?: Record<number, number>
  /** 수정 결과 안내 문구 (제외된 품목이 있으면 함께 알려줌) */
  reorderNotice?: string
  /** 있으면 새 주문이 아니라 이 주문을 고치는 모드가 된다 */
  editOrder?: EditOrderInfo
  feedItems: FeedItem[]
  /** 마감 시각이 지나 새 주문·수정을 받지 않는 상태인지 */
  closed: boolean
  /** 화면에 안내할 마감 시각('HH:MM'), 마감이 없으면 null */
  cutoffTime: string | null
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    editOrder ? updateMyOrder : placeOrder,
    {},
  )
  const [qtys, setQtys] = useState<Record<number, number>>(() => initialQtys ?? {})
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(editOrder?.fulfillment ?? 'pickup')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [confirmInfo, setConfirmInfo] = useState<{
    pickupTime: string
    address: string
    memo: string
  } | null>(null)

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

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
      const next = Math.max(0, Math.min(max, current + delta))
      // 담을 때마다 바로 눈에 띄는 확인 표시를 준다 — 실수로 눌렀는지 바로 알 수 있게
      if (delta > 0 && next > current) {
        setToast(`${item.name} ${next}개 담았어요`)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 1400)
      }
      return { ...prev, [item.id]: next }
    })
  }

  /** 확인 화면을 열기 전, 배달 주소처럼 브라우저가 검사해야 할 필수값부터 확인한다 */
  function openReview() {
    const form = formRef.current
    if (!form) return
    if (!form.reportValidity()) return
    const fd = new FormData(form)
    setConfirmInfo({
      pickupTime: String(fd.get('pickup_time') ?? '').trim(),
      address: String(fd.get('address') ?? '').trim(),
      memo: String(fd.get('memo') ?? '').trim(),
    })
  }

  function confirmAndSubmit() {
    setConfirmInfo(null)
    formRef.current?.requestSubmit()
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
    <form ref={formRef} action={formAction} className="space-y-6 pb-40">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      {editOrder && <input type="hidden" name="order_id" value={editOrder.id} />}

      <OrderFeedTicker items={feedItems} />

      {closed && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          오늘 주문이 {cutoffTime}에 마감됐습니다. 담아두실 수는 있지만 제출은 내일 다시
          이용해주세요.
        </p>
      )}

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
              defaultValue={editOrder?.pickupTime ?? ''}
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
              defaultValue={editOrder?.address || defaultAddress}
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
            defaultValue={editOrder?.memo ?? ''}
            placeholder="예) 대파는 반단만 주세요"
            maxLength={200}
          />
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-5">
          <div className="animate-toast-in rounded-full bg-stone-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 px-5 pb-6 pt-4 backdrop-blur">
        <div className="mx-auto max-w-md space-y-2.5">
          {state.error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {state.error}
            </p>
          )}
          <button
            type="button"
            onClick={() => lines.length > 0 && setCartOpen(true)}
            className="flex w-full items-baseline justify-between text-sm"
          >
            <span
              className={
                lines.length > 0 ? 'font-semibold text-brand-700 underline underline-offset-2' : 'text-stone-500'
              }
            >
              {lines.length > 0 ? `${lines.length}가지 담음 · 내역 보기` : '담은 품목 없음'}
            </span>
            <span className="text-lg font-bold">{won(total)}</span>
          </button>
          <ReviewButton
            total={total}
            count={lines.length}
            isEdit={Boolean(editOrder)}
            closed={closed}
            onClick={openReview}
          />
        </div>
      </div>

      {cartOpen && (
        <CartSheet
          items={items}
          qtys={qtys}
          total={total}
          onChange={bump}
          onClose={() => setCartOpen(false)}
        />
      )}

      {confirmInfo && (
        <OrderConfirmModal
          items={items}
          qtys={qtys}
          total={total}
          fulfillment={fulfillment}
          pickupTime={confirmInfo.pickupTime}
          address={confirmInfo.address}
          memo={confirmInfo.memo}
          isEdit={Boolean(editOrder)}
          onConfirm={confirmAndSubmit}
          onClose={() => setConfirmInfo(null)}
        />
      )}
    </form>
  )
}

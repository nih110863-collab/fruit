import Link from 'next/link'
import { redirect } from 'next/navigation'
import OrderForm from './OrderForm'
import { cancelMyOrder, leaveShop } from '../actions'
import ShopHeader from '@/components/ShopHeader'
import { getCustomerId } from '@/lib/auth'
import { getCustomer, listDailyItems, listOrdersWithItems } from '@/lib/queries'
import { formatDate, todayKST, won } from '@/lib/util'
import type { DailyItem, Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * 지난 주문의 품목을 오늘 판매목록과 이름으로 매칭해 담을 수량을 만든다.
 * 오늘 안 파는 품목이나 품절된 품목은 제외하고, 수량 제한이 있으면 남은 만큼만 담는다.
 */
function buildReorder(order: Order | undefined, items: DailyItem[]) {
  const qtys: Record<number, number> = {}
  const skipped: string[] = []
  if (!order?.items?.length) return { qtys, skipped }

  const byName = new Map(items.map((i) => [i.name, i]))
  for (const oi of order.items) {
    const item = byName.get(oi.product_name)
    if (!item || item.remaining === 0) {
      skipped.push(oi.product_name)
      continue
    }
    const qty = item.remaining === null ? oi.qty : Math.min(oi.qty, item.remaining)
    qtys[item.id] = (qtys[item.id] ?? 0) + qty
  }
  return { qtys, skipped }
}

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; reorder?: string }>
}) {
  const customerId = await getCustomerId()
  if (!customerId) redirect('/')

  const customer = await getCustomer(customerId)
  if (!customer) redirect('/')

  const { done, reorder } = await searchParams
  const today = todayKST()
  const [items, myOrders] = await Promise.all([
    listDailyItems(today, true),
    listOrdersWithItems({ customerId, limit: 5 }),
  ])

  const reorderTarget = reorder ? myOrders.find((o) => String(o.id) === reorder) : undefined
  const { qtys: reorderQtys, skipped: reorderSkipped } = buildReorder(reorderTarget, items)
  const reorderCount = Object.keys(reorderQtys).length
  const reorderNotice = reorderTarget
    ? reorderCount === 0
      ? '지난 주문의 품목이 오늘은 없어서 다시 담지 못했어요.'
      : `지난 주문을 다시 담았어요 (${reorderCount}가지)${
          reorderSkipped.length > 0 ? ` · ${reorderSkipped.join(', ')}은(는) 오늘 없어서 제외했어요` : ''
        }.`
    : undefined

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-6">
      {/* 누가 장보는 중인지 항상 보이게 — 다른 사람 이름으로 담는 실수를 막는다 */}
      <div className="sticky top-0 z-20 -mx-5 mb-4 flex items-center justify-between gap-3 bg-brand-600 px-5 py-3 text-white shadow-md">
        <p className="min-w-0 truncate text-sm">
          <span className="text-base font-bold">{customer.nickname}</span> 고객님 장보기중 입니다
        </p>
        <form action={leaveShop}>
          <button
            className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/30"
            type="submit"
          >
            나가기
          </button>
        </form>
      </div>

      <ShopHeader subtitle={formatDate(today)} />

      {done && (
        <p className="mb-5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          주문이 접수됐어요. 아래 내역에서 확인할 수 있습니다.
        </p>
      )}

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="py-6 text-sm text-stone-500">
            오늘 판매 목록이 아직 올라오지 않았어요.
            <br />
            조금 뒤에 다시 확인해주세요.
          </p>
        </div>
      ) : (
        <OrderForm
          key={reorder ?? 'default'}
          items={items}
          defaultAddress={customer.address ?? ''}
          initialQtys={reorderCount > 0 ? reorderQtys : undefined}
          reorderNotice={reorderNotice}
        />
      )}

      {myOrders.length > 0 && (
        <section className={items.length === 0 ? 'mt-8' : 'mt-8 pb-40'}>
          <h2 className="mb-3 text-sm font-bold text-stone-600">내 주문 내역</h2>
          <ul className="space-y-3">
            {myOrders.map((o) => (
              <li key={o.id} className="card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{formatDate(o.sale_date)}</span>
                  <div className="flex items-center gap-1.5">
                    {o.status === 'cancelled' ? (
                      <span className="badge bg-stone-200 text-stone-600">취소됨</span>
                    ) : o.is_paid ? (
                      <span className="badge bg-brand-100 text-brand-700">입금완료</span>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-800">입금대기</span>
                    )}
                    <span className="badge bg-stone-100 text-stone-600">
                      {o.fulfillment === 'delivery' ? '배달' : '픽업'}
                    </span>
                  </div>
                </div>

                <ul className="mt-2.5 space-y-1 text-sm text-stone-600">
                  {o.items?.map((it) => (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {it.product_name} × {it.qty}개
                      </span>
                      <span className="shrink-0 tabular-nums">{won(it.amount)}</span>
                    </li>
                  ))}
                </ul>

                {(o.pickup_time || o.address || o.memo) && (
                  <p className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-500">
                    {[o.pickup_time, o.address, o.memo].filter(Boolean).join(' · ')}
                  </p>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-stone-100 pt-2.5">
                  <span className="font-bold">{won(o.total_amount)}</span>
                  <div className="flex shrink-0 gap-1.5">
                    {items.length > 0 && (
                      <Link href={`/order?reorder=${o.id}`} className="btn-ghost btn-sm">
                        다시 담기
                      </Link>
                    )}
                    {o.status === 'confirmed' && o.sale_date === today && !o.is_paid && (
                      <form action={cancelMyOrder}>
                        <input type="hidden" name="order_id" value={o.id} />
                        <button className="btn-ghost btn-sm text-red-600" type="submit">
                          주문 취소
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

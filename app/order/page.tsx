import { redirect } from 'next/navigation'
import OrderForm from './OrderForm'
import { cancelMyOrder, leaveShop } from '../actions'
import { getCustomerId } from '@/lib/auth'
import { getCustomer, listDailyItems, listOrdersWithItems } from '@/lib/queries'
import { formatDate, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>
}) {
  const customerId = await getCustomerId()
  if (!customerId) redirect('/')

  const customer = await getCustomer(customerId)
  if (!customer) redirect('/')

  const { done } = await searchParams
  const today = todayKST()
  const [items, myOrders] = await Promise.all([
    listDailyItems(today, true),
    listOrdersWithItems({ customerId, limit: 5 }),
  ])

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || '새벽앤과일'

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-brand-600">{formatDate(today)}</p>
          <h1 className="text-xl font-bold">{shopName}</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {customer.nickname} · {customer.phone_last4}
          </p>
        </div>
        <form action={leaveShop}>
          <button className="btn-ghost btn-sm shrink-0" type="submit">
            나가기
          </button>
        </form>
      </header>

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
        <>
          <h2 className="mb-1 text-sm font-bold text-stone-600">오늘의 품목</h2>
          <OrderForm items={items} defaultAddress={customer.address ?? ''} />
        </>
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
                        {it.product_name} × {it.qty}
                        {it.unit}
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

                <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2.5">
                  <span className="font-bold">{won(o.total_amount)}</span>
                  {o.status === 'confirmed' && o.sale_date === today && !o.is_paid && (
                    <form action={cancelMyOrder}>
                      <input type="hidden" name="order_id" value={o.id} />
                      <button className="btn-ghost btn-sm text-red-600" type="submit">
                        주문 취소
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

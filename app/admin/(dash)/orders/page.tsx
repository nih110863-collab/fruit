import Link from 'next/link'
import OrderList from '../OrderList'
import { listOrdersWithItems } from '@/lib/queries'
import { formatDate, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; unpaid?: string; saved?: string; customer?: string }>
}) {
  const { date, unpaid, saved, customer } = await searchParams
  const unpaidOnly = unpaid === '1'
  const customerId = Number(customer) || undefined
  const saleDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '')
    ? date!
    : unpaidOnly || customerId
      ? undefined
      : todayKST()

  const orders = await listOrdersWithItems({ saleDate, customerId, unpaidOnly, limit: 200 })
  const total = orders
    .filter((o) => o.status === 'confirmed')
    .reduce((sum, o) => sum + o.total_amount, 0)
  const unpaidTotal = orders
    .filter((o) => o.status === 'confirmed' && !o.is_paid)
    .reduce((sum, o) => sum + o.total_amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">주문</h1>
          <p className="text-sm text-stone-500">
            {customerId
              ? `${orders[0]?.nickname ?? '고객'} 님의 전체 주문`
              : unpaidOnly
                ? '미입금 주문 전체'
                : formatDate(saleDate ?? todayKST())}
          </p>
        </div>
        <Link
          href={`/admin/orders/new${saleDate ? `?date=${saleDate}` : ''}`}
          className="btn-primary btn-sm"
        >
          + 주문 대신 넣기
        </Link>
      </div>

      {saved && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          주문 #{saved} 이(가) 저장되었습니다.
        </p>
      )}

      <div className="card space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/admin/orders"
            className={unpaidOnly ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
          >
            오늘
          </Link>
          <Link
            href="/admin/orders?unpaid=1"
            className={unpaidOnly ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
          >
            미입금만 모아보기
          </Link>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
          <div className="min-w-[10rem] flex-1">
            <label className="label" htmlFor="date">
              날짜
            </label>
            <input
              id="date"
              type="date"
              name="date"
              defaultValue={saleDate ?? ''}
              className="input py-2 text-sm"
            />
          </div>
          <button type="submit" className="btn-ghost btn-sm">
            조회
          </button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-semibold text-stone-500">건수</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{orders.length}건</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-semibold text-stone-500">합계</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{won(total)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-semibold text-stone-500">미입금</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-700">{won(unpaidTotal)}</p>
        </div>
      </div>

      <OrderList orders={orders} showDate={unpaidOnly || Boolean(customerId)} />
    </div>
  )
}

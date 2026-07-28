import Link from 'next/link'
import OrderList from './OrderList'
import { dailySummary, listDailyItems, listOrdersWithItems, pickList } from '@/lib/queries'
import { HIGHLIGHTS } from '@/lib/types'
import { formatDate, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === 'warn' ? 'text-amber-700' : 'text-stone-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export default async function AdminHome() {
  const today = todayKST()
  const [summary, orders, picks, items] = await Promise.all([
    dailySummary(today),
    listOrdersWithItems({ saleDate: today, limit: 100 }),
    pickList(today),
    listDailyItems(today),
  ])

  const lowStock = items.filter((i) => i.remaining !== null && i.remaining <= 3)
  const onSale = items.filter((i) => i.sale_active)
  const limited = items.filter((i) => i.limit_qty !== null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{formatDate(today)}</h1>
          <p className="text-sm text-stone-500">오늘 장사 현황</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/today" className="btn-ghost btn-sm">
            판매목록 짜기
          </Link>
          <Link href="/admin/orders/new" className="btn-primary btn-sm">
            + 주문 대신 넣기
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="주문 건수" value={`${summary.order_count}건`} />
        <Stat label="매출" value={won(summary.revenue)} />
        <Stat label="미입금" value={won(summary.unpaid)} tone="warn" />
        <Stat label="배달 건수" value={`${summary.delivery_count}건`} />
      </div>

      {(onSale.length > 0 || limited.length > 0) && (
        <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-bold text-brand-900">오늘의 특이사항</p>
          {onSale.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-stone-500">할인 중</p>
              <ul className="flex flex-wrap gap-2">
                {onSale.map((i) => (
                  <li key={i.id} className="badge bg-red-100 text-red-700">
                    {i.name} {won(i.sale_price!)}
                    {i.highlight && ` · ${HIGHLIGHTS.find((h) => h.key === i.highlight)?.label}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {limited.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-stone-500">수량 한정</p>
              <ul className="flex flex-wrap gap-2">
                {limited.map((i) => (
                  <li key={i.id} className="badge bg-amber-100 text-amber-800">
                    {i.name} {i.remaining === 0 ? '마감' : `${i.remaining}/${i.limit_qty}개`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">수량 얼마 안 남음</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {lowStock.map((i) => (
              <li key={i.id} className="badge bg-white text-amber-800">
                {i.name} {i.remaining === 0 ? '마감' : `${i.remaining}개`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {picks.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-stone-600">오늘 준비할 물량</h2>
          <div className="card">
            <ul className="divide-y divide-stone-100">
              {picks.map((p) => (
                <li key={p.product_name} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{p.product_name}</span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {p.qty}개
                    <span className="ml-2 font-normal text-stone-400">{won(p.amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">오늘 주문 ({orders.length}건)</h2>
        <OrderList orders={orders} />
      </section>
    </div>
  )
}

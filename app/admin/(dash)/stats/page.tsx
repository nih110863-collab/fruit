import Link from 'next/link'
import { dailySalesRange, productSalesRange } from '@/lib/queries'
import { daysAgoKST, formatDate, monthStartKST, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

function isValidDate(s?: string): s is string {
  return /^\d{4}-\d{2}-\d{2}$/.test(s ?? '')
}

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

function Bar({ ratio, color = 'bg-brand-500' }: { ratio: number; color?: string }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
      />
    </div>
  )
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from: fromParam, to: toParam } = await searchParams
  const today = todayKST()

  const rawFrom = isValidDate(fromParam) ? fromParam : daysAgoKST(6)
  const rawTo = isValidDate(toParam) ? toParam : today
  const [from, to] = rawFrom <= rawTo ? [rawFrom, rawTo] : [rawTo, rawFrom]
  const single = from === to

  const [daily, products] = await Promise.all([
    dailySalesRange(from, to),
    productSalesRange(from, to),
  ])

  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = daily.reduce((s, d) => s + d.order_count, 0)
  const totalUnpaid = daily.reduce((s, d) => s + d.unpaid, 0)
  const avgOrder = totalOrders ? Math.round(totalRevenue / totalOrders) : 0

  const maxDailyRevenue = Math.max(1, ...daily.map((d) => d.revenue))
  const maxProductRevenue = Math.max(1, ...products.map((p) => p.revenue))

  const presets = [
    { label: '오늘', from: today, to: today },
    { label: '최근 7일', from: daysAgoKST(6), to: today },
    { label: '최근 30일', from: daysAgoKST(29), to: today },
    { label: '이번 달', from: monthStartKST(), to: today },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">매출 통계</h1>
        <p className="text-sm text-stone-500">
          {single ? formatDate(from) : `${formatDate(from)} ~ ${formatDate(to)}`}
        </p>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const active = p.from === from && p.to === to
            return (
              <Link
                key={p.label}
                href={`/admin/stats?from=${p.from}&to=${p.to}`}
                className={active ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              >
                {p.label}
              </Link>
            )
          })}
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
          <div>
            <label className="label text-xs" htmlFor="from">
              시작
            </label>
            <input id="from" type="date" name="from" defaultValue={from} className="input py-2 text-sm" />
          </div>
          <div>
            <label className="label text-xs" htmlFor="to">
              끝
            </label>
            <input id="to" type="date" name="to" defaultValue={to} className="input py-2 text-sm" />
          </div>
          <button type="submit" className="btn-ghost btn-sm">
            조회
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="매출" value={won(totalRevenue)} />
        <Stat label="주문 건수" value={`${totalOrders}건`} />
        <Stat label="평균 객단가" value={won(avgOrder)} />
        <Stat label="미입금" value={won(totalUnpaid)} tone={totalUnpaid > 0 ? 'warn' : 'default'} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">일별 판매현황</h2>
        {daily.length === 0 ? (
          <div className="card text-center text-sm text-stone-500">
            <p className="py-6">이 기간에는 주문이 없습니다.</p>
          </div>
        ) : (
          <div className="card">
            <ul className="divide-y divide-stone-100">
              {daily.map((d) => (
                <li key={d.sale_date}>
                  <Link
                    href={`/admin/stats?from=${d.sale_date}&to=${d.sale_date}`}
                    className="-mx-4 block rounded-lg px-4 py-2.5 transition hover:bg-stone-50"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span
                        className={`font-semibold ${d.sale_date === from && single ? 'text-brand-700' : ''}`}
                      >
                        {formatDate(d.sale_date)}
                      </span>
                      <span className="shrink-0 tabular-nums text-stone-600">
                        {d.order_count}건 · <b className="text-stone-900">{won(d.revenue)}</b>
                        {d.unpaid > 0 && (
                          <span className="ml-1.5 text-amber-700">미입금 {won(d.unpaid)}</span>
                        )}
                      </span>
                    </div>
                    <Bar ratio={d.revenue / maxDailyRevenue} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-1.5 text-xs text-stone-400">날짜를 누르면 그날 품목별 판매만 볼 수 있습니다.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">
          품목별 판매현황{single && ` — ${formatDate(from)}`}
        </h2>
        {products.length === 0 ? (
          <div className="card text-center text-sm text-stone-500">
            <p className="py-6">이 기간에는 팔린 품목이 없습니다.</p>
          </div>
        ) : (
          <div className="card">
            <ul className="divide-y divide-stone-100">
              {products.map((p) => (
                <li key={p.product_name} className="py-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{p.product_name}</span>
                    <span className="shrink-0 tabular-nums text-stone-600">
                      {p.qty}개 · 주문 {p.order_count}건 ·{' '}
                      <b className="text-stone-900">{won(p.revenue)}</b>
                    </span>
                  </div>
                  <Bar ratio={p.revenue / maxProductRevenue} color="bg-amber-500" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

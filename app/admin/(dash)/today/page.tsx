import Link from 'next/link'
import CategorySelect from '@/components/CategorySelect'
import MoneyInput from '@/components/MoneyInput'
import { addProductsToDate, copyDailyItems, quickAddItem } from '../../actions'
import DailyItemsList from './DailyItemsList'
import { SaleSelectionProvider } from './SaleToolbar'
import { listDailyItems, listProducts, previousSaleDate } from '@/lib/queries'
import { formatDate, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const saleDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? date! : todayKST()

  const [items, products, prevDate] = await Promise.all([
    listDailyItems(saleDate),
    listProducts(),
    previousSaleDate(saleDate),
  ])

  const usedIds = new Set(items.map((i) => i.product_id))
  const available = products.filter((p) => !usedIds.has(p.id))
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">판매목록 짜기</h1>
          <p className="text-sm text-stone-500">
            품목은 매일 바뀌어도, 한 번 등록한 품목은 품목함에 계속 남습니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {prevDate && (
            <form action={copyDailyItems}>
              <input type="hidden" name="from_date" value={prevDate} />
              <input type="hidden" name="to_date" value={saleDate} />
              <button
                type="submit"
                className="btn-ghost btn-sm"
                title={`직전 판매일 ${formatDate(prevDate)} 목록을 그대로 가져옵니다 (이미 있는 품목은 건너뜁니다)`}
              >
                전일 목록 가져오기
              </button>
            </form>
          )}
          <Link
            href="/admin/products"
            className="btn btn-sm border-transparent bg-orange-500 text-white shadow-sm hover:bg-orange-600"
          >
            품목함 바로가기
          </Link>
        </div>
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[10rem]">
          <label className="label" htmlFor="date">
            판매 날짜
          </label>
          <input id="date" type="date" name="date" defaultValue={saleDate} className="input" />
        </div>
        <button type="submit" className="btn-ghost">
          이동
        </button>
      </form>

      <p className="text-sm font-semibold text-brand-700">{formatDate(saleDate)} 판매목록</p>

      {/* 품목함에서 꺼내오기 */}
      <details className="card" open={items.length === 0}>
        <summary className="cursor-pointer text-sm font-bold text-stone-700">
          품목함에서 꺼내오기 ({available.length}개)
        </summary>
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            품목함에 있는 품목이 모두 오늘 목록에 들어가 있습니다.
          </p>
        ) : (
          <form action={addProductsToDate} className="mt-3 space-y-3">
            <input type="hidden" name="sale_date" value={saleDate} />
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {available.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5 text-sm hover:bg-stone-50">
                    <input
                      type="checkbox"
                      name="product_ids"
                      value={p.id}
                      className="size-4 accent-emerald-700"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 text-xs text-stone-500">{won(p.default_price)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="submit" className="btn-primary w-full">
              선택한 품목 목록에 올리기
            </button>
          </form>
        )}
      </details>

      {/* 새 품목 즉석 등록 */}
      <details className="card">
        <summary className="cursor-pointer text-sm font-bold text-stone-700">
          새 품목 등록해서 바로 올리기
        </summary>
        <form action={quickAddItem} className="mt-3 space-y-3">
          <input type="hidden" name="sale_date" value={saleDate} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">분류</label>
              <CategorySelect categories={categories} />
            </div>
            <div>
              <label className="label">품목명</label>
              <input name="name" className="input" placeholder="예) 햇감자" required maxLength={40} />
            </div>
            <div>
              <label className="label">가격 (원)</label>
              <MoneyInput name="price" className="input" placeholder="5000" required />
            </div>
            <div>
              <label className="label">
                수량 제한 <span className="font-normal text-stone-400">비우면 무제한</span>
              </label>
              <input name="limit_qty" className="input" inputMode="numeric" placeholder="예) 10" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-4 text-base">
            등록하기
          </button>
        </form>
      </details>

      {/* 현재 목록 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">
          올라간 품목 ({items.length}개)
        </h2>

        {items.length === 0 ? (
          <div className="card text-center text-sm text-stone-500">
            <p className="py-6">아직 올린 품목이 없습니다. 위에서 꺼내오거나 새로 등록해주세요.</p>
          </div>
        ) : (
          <SaleSelectionProvider items={items.map((it) => ({ id: it.id, name: it.name }))}>
            <DailyItemsList items={items} />
          </SaleSelectionProvider>
        )}
      </section>
    </div>
  )
}

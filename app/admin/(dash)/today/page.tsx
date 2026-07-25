import ProductImage from '@/components/ProductImage'
import {
  addProductsToDate,
  copyDailyItems,
  quickAddItem,
  removeDailyItem,
  toggleDailyItem,
  updateDailyItem,
} from '../../actions'
import { listDailyItems, listProducts, previousSaleDate } from '@/lib/queries'
import { HIGHLIGHTS } from '@/lib/types'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">판매목록 짜기</h1>
        <p className="text-sm text-stone-500">
          품목은 매일 바뀌어도, 한 번 등록한 품목은 품목함에 계속 남습니다.
        </p>
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

      {/* 지난 판매일 복사 */}
      {prevDate && (
        <form action={copyDailyItems} className="card flex flex-wrap items-center gap-3">
          <input type="hidden" name="from_date" value={prevDate} />
          <input type="hidden" name="to_date" value={saleDate} />
          <p className="flex-1 text-sm text-stone-600">
            직전 판매일 <b>{formatDate(prevDate)}</b> 목록을 그대로 가져올까요?
            <span className="ml-1 text-stone-400">(이미 있는 품목은 건너뜁니다)</span>
          </p>
          <button type="submit" className="btn-ghost btn-sm">
            그대로 복사
          </button>
        </form>
      )}

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
                    <span className="shrink-0 text-xs text-stone-500">
                      {won(p.default_price)}/{p.unit}
                    </span>
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
        <form action={quickAddItem} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="sale_date" value={saleDate} />
          <div className="sm:col-span-2">
            <label className="label">품목명</label>
            <input name="name" className="input" placeholder="예) 햇감자" required maxLength={40} />
          </div>
          <div>
            <label className="label">단위</label>
            <input name="unit" className="input" placeholder="개 / 봉 / 팩" defaultValue="개" maxLength={10} />
          </div>
          <div>
            <label className="label">분류 (선택)</label>
            <input name="category" className="input" placeholder="과일 / 채소" maxLength={20} />
          </div>
          <div>
            <label className="label">가격 (원)</label>
            <input name="price" className="input" inputMode="numeric" placeholder="5000" required />
          </div>
          <div>
            <label className="label">
              수량 제한 <span className="font-normal text-stone-400">비우면 무제한</span>
            </label>
            <input name="limit_qty" className="input" inputMode="numeric" placeholder="예) 10" />
          </div>
          <button type="submit" className="btn-primary sm:col-span-2">
            등록하고 목록에 올리기
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
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className={`card flex gap-3 ${it.is_active ? '' : 'opacity-60'}`}>
                <ProductImage
                  productId={it.product_id}
                  version={it.image_version}
                  hasImage={it.has_image}
                  name={it.name}
                  className="size-16 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{it.name}</span>
                    <span className="text-xs text-stone-400">/{it.unit}</span>
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
                        {it.remaining === 0 ? '마감' : `${it.remaining}${it.unit} 남음`}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-500">
                    주문됨 {it.ordered_qty}
                    {it.unit}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-end gap-2">
                  <form action={updateDailyItem} className="flex-1 space-y-2">
                    <input type="hidden" name="id" value={it.id} />

                    <div className="flex flex-wrap items-end gap-2">
                      <div className="w-28">
                        <label className="label text-xs">정가</label>
                        <input
                          name="price"
                          className="input py-2 text-sm"
                          inputMode="numeric"
                          defaultValue={it.price}
                        />
                      </div>
                      <div className="w-24">
                        <label className="label text-xs">제한</label>
                        <input
                          name="limit_qty"
                          className="input py-2 text-sm"
                          inputMode="numeric"
                          placeholder="무제한"
                          defaultValue={it.limit_qty ?? ''}
                        />
                      </div>
                      <div className="w-20">
                        <label className="label text-xs">순서</label>
                        <input
                          name="sort_order"
                          className="input py-2 text-sm"
                          inputMode="numeric"
                          defaultValue={it.sort_order}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-stone-50 p-2">
                      <div className="w-28">
                        <label className="label text-xs">세일가</label>
                        <input
                          name="sale_price"
                          className="input py-2 text-sm"
                          inputMode="numeric"
                          placeholder="없음"
                          defaultValue={it.sale_price ?? ''}
                        />
                      </div>
                      <div className="w-28">
                        <label className="label text-xs">세일 시작</label>
                        <input
                          type="time"
                          name="sale_from"
                          className="input py-2 text-sm"
                          defaultValue={it.sale_from ?? ''}
                        />
                      </div>
                      <div className="w-28">
                        <label className="label text-xs">세일 종료</label>
                        <input
                          type="time"
                          name="sale_to"
                          className="input py-2 text-sm"
                          defaultValue={it.sale_to ?? ''}
                        />
                      </div>
                      <div className="w-36">
                        <label className="label text-xs">노출 구역</label>
                        <select
                          name="highlight"
                          className="input py-2 text-sm"
                          defaultValue={it.highlight ?? ''}
                        >
                          <option value="">일반</option>
                          {HIGHLIGHTS.map((h) => (
                            <option key={h.key} value={h.key}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="w-full text-[11px] text-stone-400">
                        세일 시간을 비우면 하루 종일 세일가로 팝니다. 노출 구역을 고르면
                        고객 화면 맨 위 특별 구역에 올라갑니다.
                      </p>
                    </div>

                    <button type="submit" className="btn-ghost btn-sm">
                      저장
                    </button>
                  </form>

                  <div className="flex gap-1.5">
                    <form action={toggleDailyItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button type="submit" className="btn-ghost btn-sm">
                        {it.is_active ? '숨기기' : '보이기'}
                      </button>
                    </form>
                    <form action={removeDailyItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button type="submit" className="btn-ghost btn-sm text-red-600">
                        내리기
                      </button>
                    </form>
                  </div>
                </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

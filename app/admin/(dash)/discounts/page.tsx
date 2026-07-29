import ProductImage from '@/components/ProductImage'
import { ItemCheckbox, SaleToolbarPanel, SelectionControls, SelectionProvider } from '../today/SaleToolbar'
import { listDailyItems } from '@/lib/queries'
import { HIGHLIGHTS } from '@/lib/types'
import type { DailyItem } from '@/lib/types'
import { formatDate, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

const NO_HIGHLIGHT = '세일 없음'

/** 노출 구역(할인 섹션)별로 묶는다 — 타임세일 → 한정수량세일 → 오늘의 베스트 → 세일 없음 순 */
function groupByHighlight(items: DailyItem[]) {
  const byHighlight = new Map<string, DailyItem[]>()
  for (const it of items) {
    const key = it.highlight ?? NO_HIGHLIGHT
    if (!byHighlight.has(key)) byHighlight.set(key, [])
    byHighlight.get(key)!.push(it)
  }
  const order = [...HIGHLIGHTS.map((h) => h.key), NO_HIGHLIGHT]
  return order
    .map((key) => [key, byHighlight.get(key) ?? []] as const)
    .filter(([, group]) => group.length > 0)
}

function highlightLabel(key: string): string {
  return HIGHLIGHTS.find((h) => h.key === key)?.label ?? key
}

export default async function DiscountsPage() {
  const saleDate = todayKST()

  const items = await listDailyItems(saleDate)
  const groups = groupByHighlight(items)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">할인 설정</h1>
        <p className="text-sm text-stone-500">
          {formatDate(saleDate)} 판매목록의 세일가·노출 구역을 관리합니다.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          <p className="py-6">이 날짜에는 등록된 판매목록이 없습니다.</p>
        </div>
      ) : (
        <SelectionProvider>
          <SelectionControls items={items.map((it) => ({ id: it.id, name: it.name }))} />
          <SaleToolbarPanel />

          <div className="space-y-4">
            {groups.map(([key, group]) => (
              <div key={key}>
                <h3 className="mb-2 text-xs font-bold text-stone-500">
                  {highlightLabel(key)} ({group.length}개)
                </h3>
                <ul className="space-y-2">
                  {group.map((it) => (
                    <li key={it.id} className="card flex items-center gap-3">
                      <ItemCheckbox id={it.id} label={it.name} />

                      <ProductImage
                        productId={it.product_id}
                        version={it.image_version}
                        hasImage={it.has_image}
                        name={it.name}
                        className="size-11 shrink-0 rounded-lg"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="truncate font-bold">{it.name}</span>
                          {it.sale_price && (
                            <span className="badge bg-red-100 text-red-700">
                              세일 {won(it.sale_price)}
                              {it.sale_from && ` ${it.sale_from}~${it.sale_to ?? ''}`}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {it.category && `[${it.category}] · `}정가 {won(it.price)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SelectionProvider>
      )}
    </div>
  )
}

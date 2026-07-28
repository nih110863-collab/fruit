import ProductImage from '@/components/ProductImage'
import { ItemCheckbox, SaleToolbarPanel, SelectionProvider } from '../today/SaleToolbar'
import { listDailyItems } from '@/lib/queries'
import { HIGHLIGHTS } from '@/lib/types'
import { formatDate, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function DiscountsPage() {
  const saleDate = todayKST()

  const items = await listDailyItems(saleDate)

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
          <SaleToolbarPanel
            items={items.map((it) => ({ id: it.id, name: it.name }))}
            defaultOpen
          />

          <ul className="space-y-2">
            {items.map((it) => (
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
                    {it.highlight && (
                      <span className="badge bg-brand-100 text-brand-700">
                        {HIGHLIGHTS.find((h) => h.key === it.highlight)?.label}
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
        </SelectionProvider>
      )}
    </div>
  )
}

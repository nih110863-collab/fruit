import Link from 'next/link'
import { redirect } from 'next/navigation'
import CustomerPicker from './CustomerPicker'
import ProductImage from '@/components/ProductImage'
import { getCustomerId } from '@/lib/auth'
import { listCustomerDirectory, listDailyItems } from '@/lib/queries'
import { todayKST, formatDate, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (await getCustomerId()) redirect('/order')

  const today = todayKST()
  const [items, customers] = await Promise.all([
    listDailyItems(today, true),
    listCustomerDirectory(),
  ])
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || '새벽앤과일'
  const onSale = items.filter((it) => it.remaining !== 0).length

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-32 pt-6">
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{shopName}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{formatDate(today)}</p>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 text-sm font-semibold text-brand-600">
            오늘 {onSale}가지
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="py-8 text-sm text-stone-500">
            오늘 판매 목록이 아직 올라오지 않았어요.
            <br />
            조금 뒤에 다시 확인해주세요.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="relative">
                <ProductImage
                  productId={it.product_id}
                  version={it.image_version}
                  hasImage={it.has_image}
                  name={it.name}
                  className="aspect-square w-full"
                  sizes="(max-width: 448px) 45vw, 200px"
                />

                {it.remaining === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/45">
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-stone-700">
                      오늘 마감
                    </span>
                  </div>
                ) : (
                  it.limit_qty !== null && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-stone-600 shadow">
                      한정 {it.limit_qty}
                      {it.unit}
                    </span>
                  )
                )}
              </div>

              <div className="p-2.5">
                <p
                  className={`truncate text-sm font-bold ${
                    it.remaining === 0 ? 'text-stone-400' : 'text-stone-900'
                  }`}
                >
                  {it.name}
                </p>
                <p className="mt-0.5 text-sm text-stone-500">
                  <span className="font-semibold text-stone-800">{won(it.price)}</span> / {it.unit}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 text-center">
        <Link href="/admin" className="text-xs text-stone-400 underline underline-offset-4">
          사장님 관리자
        </Link>
      </div>

      <CustomerPicker customers={customers} />
    </main>
  )
}

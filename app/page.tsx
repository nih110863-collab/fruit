import Link from 'next/link'
import { redirect } from 'next/navigation'
import CustomerPicker from './CustomerPicker'
import HomeBrowser from './HomeBrowser'
import ShopHeader from '@/components/ShopHeader'
import { getCustomerId } from '@/lib/auth'
import { listCustomerDirectory, listDailyItems } from '@/lib/queries'
import { todayKST, formatDate } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (await getCustomerId()) redirect('/order')

  const today = todayKST()
  const [items, customers] = await Promise.all([
    listDailyItems(today, true),
    listCustomerDirectory(),
  ])
  const onSale = items.filter((it) => it.remaining !== 0).length

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-32 pt-6">
      <ShopHeader
        subtitle={formatDate(today)}
        right={
          items.length > 0 ? (
            <span className="shrink-0 text-sm font-semibold text-brand-600">오늘 {onSale}가지</span>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="py-8 text-sm text-stone-500">
            오늘 판매 목록이 아직 올라오지 않았어요.
            <br />
            조금 뒤에 다시 확인해주세요.
          </p>
        </div>
      ) : (
        <HomeBrowser items={items} />
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

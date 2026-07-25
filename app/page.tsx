import Link from 'next/link'
import { redirect } from 'next/navigation'
import CustomerPicker from './CustomerPicker'
import HomeBrowser from './HomeBrowser'
import ShopHeader from '@/components/ShopHeader'
import { getCustomerId } from '@/lib/auth'
import { getOrderCutoffTime, listCustomerDirectory, listDailyItems, recentFeed } from '@/lib/queries'
import { nowTimeKST, todayKST, formatDate } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (await getCustomerId()) redirect('/order')

  const today = todayKST()
  const [items, customers, feedItems, cutoffTime] = await Promise.all([
    listDailyItems(today, true),
    listCustomerDirectory(),
    recentFeed(),
    getOrderCutoffTime(),
  ])
  const orderClosed = Boolean(cutoffTime && nowTimeKST() >= cutoffTime)

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-32 pt-6">
      <ShopHeader subtitle={formatDate(today)} />

      {orderClosed && (
        <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          오늘 주문은 {cutoffTime}에 마감됐습니다. 둘러보실 수는 있고, 주문은 내일 다시
          이용해주세요.
        </p>
      )}

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="py-8 text-sm text-stone-500">
            오늘 판매 목록이 아직 올라오지 않았어요.
            <br />
            조금 뒤에 다시 확인해주세요.
          </p>
        </div>
      ) : (
        <HomeBrowser items={items} feedItems={feedItems} />
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

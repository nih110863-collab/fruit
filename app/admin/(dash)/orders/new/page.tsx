import Link from 'next/link'
import AdminOrderForm from '../AdminOrderForm'
import { listCustomers, listDailyItems } from '@/lib/queries'
import { formatDate, todayKST } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; customer?: string }>
}) {
  const { date, customer } = await searchParams
  const saleDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? date! : todayKST()

  const [items, customers] = await Promise.all([listDailyItems(saleDate), listCustomers()])
  const preselected = customers.find((c: any) => String(c.id) === customer)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">주문 대신 넣기</h1>
          <p className="text-sm text-stone-500">{formatDate(saleDate)}</p>
        </div>
        <Link href="/admin/orders" className="btn-ghost btn-sm">
          목록으로
        </Link>
      </div>

      {items.length === 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          이 날짜에 올라간 판매 품목이 없습니다.{' '}
          <Link href={`/admin/today?date=${saleDate}`} className="underline">
            판매목록 먼저 짜기
          </Link>
        </p>
      )}

      <AdminOrderForm
        saleDate={saleDate}
        items={items}
        customers={customers.map((c: any) => ({
          id: c.id,
          nickname: c.nickname,
          phone_last4: c.phone_last4,
          address: c.address,
        }))}
        initialCustomer={
          preselected
            ? {
                id: preselected.id,
                nickname: preselected.nickname,
                phone_last4: preselected.phone_last4,
                address: preselected.address,
              }
            : undefined
        }
      />
    </div>
  )
}

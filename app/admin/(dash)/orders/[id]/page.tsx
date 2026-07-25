import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminOrderForm from '../AdminOrderForm'
import { getOrder, listCustomers, listDailyItems } from '@/lib/queries'
import { formatDate } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = Number(id)
  if (!Number.isInteger(orderId)) notFound()

  const order = await getOrder(orderId)
  if (!order) notFound()

  const [items, customers] = await Promise.all([
    listDailyItems(order.sale_date),
    listCustomers(),
  ])

  // 이 주문이 이미 잡아둔 수량은 남은 수량에 다시 더해서 보여준다
  const adjusted = items.map((item) => {
    const mine = order.items?.find(
      (oi) => oi.daily_item_id === item.id || oi.product_id === item.product_id,
    )
    if (!mine || order.status !== 'confirmed') return item
    return {
      ...item,
      ordered_qty: item.ordered_qty - mine.qty,
      remaining: item.remaining === null ? null : item.remaining + mine.qty,
    }
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">주문 수정 #{order.id}</h1>
          <p className="text-sm text-stone-500">
            {formatDate(order.sale_date)} · {order.nickname} {order.phone_last4}
          </p>
        </div>
        <Link href={`/admin/orders?date=${order.sale_date}`} className="btn-ghost btn-sm">
          목록으로
        </Link>
      </div>

      {order.status === 'cancelled' && (
        <p className="rounded-xl bg-stone-200 px-4 py-3 text-sm font-medium text-stone-700">
          취소된 주문입니다. 수정하려면 먼저 목록에서 되돌려주세요.
        </p>
      )}

      <AdminOrderForm
        saleDate={order.sale_date}
        items={adjusted}
        customers={customers.map((c: any) => ({
          id: c.id,
          nickname: c.nickname,
          phone_last4: c.phone_last4,
          address: c.address,
        }))}
        order={order}
      />
    </div>
  )
}

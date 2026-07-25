import Link from 'next/link'
import { deleteOrder, setOrderStatus, togglePaid } from '../actions'
import { formatDate, won } from '@/lib/util'
import type { Order } from '@/lib/types'

export default function OrderList({
  orders,
  showDate = false,
}: {
  orders: Order[]
  showDate?: boolean
}) {
  if (!orders.length) {
    return (
      <div className="card text-center text-sm text-stone-500">
        <p className="py-6">아직 주문이 없습니다.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const cancelled = o.status === 'cancelled'
        return (
          <li key={o.id} className={`card ${cancelled ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">{o.nickname}</span>
                <span className="text-sm text-stone-400">{o.phone_last4}</span>
                {o.source === 'admin' && (
                  <span className="badge bg-stone-100 text-stone-500">대리주문</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {showDate && (
                  <span className="badge bg-stone-100 text-stone-600">
                    {formatDate(o.sale_date)}
                  </span>
                )}
                <span
                  className={`badge ${
                    o.fulfillment === 'delivery'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {o.fulfillment === 'delivery' ? '배달' : '픽업'}
                </span>
                {cancelled ? (
                  <span className="badge bg-stone-200 text-stone-600">취소됨</span>
                ) : o.is_paid ? (
                  <span className="badge bg-brand-100 text-brand-700">입금완료</span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-800">입금대기</span>
                )}
              </div>
            </div>

            <ul className="mt-2.5 space-y-1 text-sm">
              {o.items?.map((it) => (
                <li key={it.id} className="flex justify-between gap-3">
                  <span className="truncate text-stone-700">
                    {it.product_name}{' '}
                    <span className="font-semibold text-stone-900">
                      × {it.qty}
                      {it.unit}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-stone-500">{won(it.amount)}</span>
                </li>
              ))}
            </ul>

            {(o.pickup_time || o.address || o.memo) && (
              <dl className="mt-2.5 space-y-1 border-t border-stone-100 pt-2.5 text-xs text-stone-600">
                {o.pickup_time && (
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 text-stone-400">픽업</dt>
                    <dd>{o.pickup_time}</dd>
                  </div>
                )}
                {o.address && (
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 text-stone-400">주소</dt>
                    <dd>{o.address}</dd>
                  </div>
                )}
                {o.memo && (
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 text-stone-400">메모</dt>
                    <dd className="font-medium text-amber-700">{o.memo}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
              <span className="text-lg font-bold">{won(o.total_amount)}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {!cancelled && (
                  <form action={togglePaid}>
                    <input type="hidden" name="id" value={o.id} />
                    <button
                      type="submit"
                      className={o.is_paid ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
                    >
                      {o.is_paid ? '입금 취소' : '입금 확인'}
                    </button>
                  </form>
                )}
                <Link href={`/admin/orders/${o.id}`} className="btn-ghost btn-sm">
                  수정
                </Link>
                <form action={setOrderStatus}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="status" value={cancelled ? 'confirmed' : 'cancelled'} />
                  <button type="submit" className="btn-ghost btn-sm">
                    {cancelled ? '되돌리기' : '주문취소'}
                  </button>
                </form>
                {cancelled && (
                  <form action={deleteOrder}>
                    <input type="hidden" name="id" value={o.id} />
                    <button type="submit" className="btn-ghost btn-sm text-red-600">
                      삭제
                    </button>
                  </form>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

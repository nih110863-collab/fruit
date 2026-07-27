import Link from 'next/link'
import OrderList from './OrderList'
import {
  addFakeFeedItem,
  deleteFakeFeedItem,
  toggleFakeFeedItem,
  updateOrderCutoff,
  updateShopInfo,
} from '../actions'
import {
  dailySummary,
  getShopSettings,
  listDailyItems,
  listFakeFeedItems,
  listOrdersWithItems,
  pickList,
} from '@/lib/queries'
import { formatDate, todayKST, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === 'warn' ? 'text-amber-700' : 'text-stone-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export default async function AdminHome() {
  const today = todayKST()
  const [summary, orders, picks, items, shopSettings, fakeFeed] = await Promise.all([
    dailySummary(today),
    listOrdersWithItems({ saleDate: today, limit: 100 }),
    pickList(today),
    listDailyItems(today),
    getShopSettings(),
    listFakeFeedItems(),
  ])
  const cutoffTime = shopSettings.orderCutoffTime

  const lowStock = items.filter((i) => i.remaining !== null && i.remaining <= 3)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{formatDate(today)}</h1>
          <p className="text-sm text-stone-500">오늘 장사 현황</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/today" className="btn-ghost btn-sm">
            판매목록 짜기
          </Link>
          <Link href="/admin/orders/new" className="btn-primary btn-sm">
            + 주문 대신 넣기
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="주문 건수" value={`${summary.order_count}건`} />
        <Stat label="매출" value={won(summary.revenue)} />
        <Stat label="미입금" value={won(summary.unpaid)} tone="warn" />
        <Stat label="배달 건수" value={`${summary.delivery_count}건`} />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">수량 얼마 안 남음</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {lowStock.map((i) => (
              <li key={i.id} className="badge bg-white text-amber-800">
                {i.name} {i.remaining === 0 ? '마감' : `${i.remaining}개`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {picks.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-stone-600">오늘 준비할 물량</h2>
          <div className="card">
            <ul className="divide-y divide-stone-100">
              {picks.map((p) => (
                <li key={p.product_name} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{p.product_name}</span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {p.qty}개
                    <span className="ml-2 font-normal text-stone-400">{won(p.amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">오늘 주문 ({orders.length}건)</h2>
        <OrderList orders={orders} />
      </section>

      <details className="card">
        <summary className="cursor-pointer text-sm font-bold text-stone-700">
          설정 — 가게 정보 · 주문 마감 시간 · 실시간 알림
        </summary>

        <div className="mt-4 space-y-2">
          <p className="label">가게 정보</p>
          <form action={updateShopInfo} className="grid gap-2 sm:grid-cols-2">
            <label>
              <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">
                가게 이름
              </span>
              <input
                name="shop_name"
                className="input py-2 text-sm"
                defaultValue={shopSettings.shopName}
                maxLength={30}
              />
            </label>
            <label>
              <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">
                지점명 (선택)
              </span>
              <input
                name="shop_branch"
                className="input py-2 text-sm"
                defaultValue={shopSettings.shopBranch ?? ''}
                placeholder="예: 인천논현점"
                maxLength={30}
              />
            </label>
            <label>
              <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">
                연락처 (선택)
              </span>
              <input
                name="shop_phone"
                className="input py-2 text-sm"
                defaultValue={shopSettings.shopPhone ?? ''}
                placeholder="032-000-0000"
                maxLength={20}
              />
            </label>
            <label>
              <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">
                오픈채팅 링크 (선택)
              </span>
              <input
                name="openchat_url"
                className="input py-2 text-sm"
                defaultValue={shopSettings.openChatUrl ?? ''}
                placeholder="https://open.kakao.com/o/..."
                maxLength={200}
              />
            </label>
            <button type="submit" className="btn-ghost btn-sm sm:col-span-2">
              저장
            </button>
          </form>
          <p className="text-xs text-stone-400">
            연락처를 넣으면 고객 화면에 전화 버튼이, 오픈채팅 링크를 넣으면 채팅 버튼이
            나타납니다. 비워서 저장하면 그 버튼은 사라집니다.
          </p>
        </div>

        <div className="mt-6 space-y-2 border-t border-stone-100 pt-4">
          <p className="label">주문 마감 시간</p>
          <form action={updateOrderCutoff} className="flex flex-wrap items-end gap-2">
            <input
              type="time"
              name="order_cutoff_time"
              defaultValue={cutoffTime ?? ''}
              className="input py-2 text-sm"
            />
            <button type="submit" className="btn-ghost btn-sm">
              저장
            </button>
          </form>
          <p className="text-xs text-stone-400">
            {cutoffTime
              ? `${cutoffTime} 이후로는 고객이 새 주문·수정을 할 수 없습니다.`
              : '비워두면 마감 없이 하루 종일 주문을 받습니다.'}{' '}
            빈칸으로 저장하면 마감이 해제됩니다.
          </p>
        </div>

        <div className="mt-6 space-y-2 border-t border-stone-100 pt-4">
          <p className="label">실시간 주문 알림 — 예시 데이터</p>
          <p className="text-xs text-stone-400">
            고객 화면 위쪽에 "○○님이 △△를 담았어요"가 실제 주문과 섞여 돌아갑니다. 오픈 초반
            실제 주문이 적을 때 예시를 몇 개 넣어두면 자연스럽게 채워집니다.
          </p>

          <form action={addFakeFeedItem} className="grid grid-cols-3 gap-2">
            <input name="nickname" className="input py-2 text-sm" placeholder="닉네임" maxLength={20} />
            <input
              name="product_name"
              className="input py-2 text-sm"
              placeholder="품목명"
              maxLength={40}
            />
            <input
              name="qty"
              className="input py-2 text-sm"
              inputMode="numeric"
              placeholder="수량(1)"
            />
            <button type="submit" className="btn-primary btn-sm col-span-3">
              예시 추가
            </button>
          </form>

          {fakeFeed.length > 0 && (
            <ul className="divide-y divide-stone-100">
              {fakeFeed.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className={`truncate ${f.is_active ? '' : 'text-stone-400 line-through'}`}>
                    {f.nickname}님이 {f.product_name} {f.qty > 1 ? `${f.qty}개` : ''} 담았어요
                  </span>
                  <div className="flex shrink-0 gap-1.5">
                    <form action={toggleFakeFeedItem}>
                      <input type="hidden" name="id" value={f.id} />
                      <button type="submit" className="btn-ghost btn-sm">
                        {f.is_active ? '숨김' : '보임'}
                      </button>
                    </form>
                    <form action={deleteFakeFeedItem}>
                      <input type="hidden" name="id" value={f.id} />
                      <button type="submit" className="btn-ghost btn-sm text-red-600">
                        삭제
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  )
}

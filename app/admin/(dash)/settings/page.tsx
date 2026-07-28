import {
  addFakeFeedItem,
  deleteFakeFeedItem,
  toggleFakeFeedItem,
  updateOrderCutoff,
  updateShopInfo,
} from '../../actions'
import { getShopSettings, listFakeFeedItems } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [shopSettings, fakeFeed] = await Promise.all([getShopSettings(), listFakeFeedItems()])
  const cutoffTime = shopSettings.orderCutoffTime

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">가게 관리</h1>
        <p className="text-sm text-stone-500">가게 정보 · 주문 마감 시간 · 실시간 알림을 설정합니다.</p>
      </div>

      <section className="card space-y-2">
        <p className="label">가게 정보</p>
        <form action={updateShopInfo} className="grid gap-2 sm:grid-cols-2">
          <label>
            <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">가게 이름</span>
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
          연락처를 넣으면 고객 화면에 전화 버튼이, 오픈채팅 링크를 넣으면 채팅 버튼이 나타납니다.
          비워서 저장하면 그 버튼은 사라집니다.
        </p>
      </section>

      <section className="card space-y-2">
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
      </section>

      <section className="card space-y-2">
        <p className="label">실시간 주문 알림 — 예시 데이터</p>
        <p className="text-xs text-stone-400">
          고객 화면 위쪽에 "○○님이 △△를 담았어요"가 실제 주문과 섞여 돌아갑니다. 오픈 초반 실제
          주문이 적을 때 예시를 몇 개 넣어두면 자연스럽게 채워집니다.
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
      </section>
    </div>
  )
}

import Link from 'next/link'
import { createCustomer, deleteCustomer, resetCustomerPin, updateCustomer } from '../../actions'
import { listCustomers } from '@/lib/queries'
import { formatDate, won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const customers = await listCustomers(q)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">고객</h1>
        <p className="text-sm text-stone-500">
          닉네임 + 휴대폰 뒷 4자리로 구분합니다. 같은 조합은 같은 사람으로 처리됩니다.
        </p>
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="label" htmlFor="q">
            검색
          </label>
          <input
            id="q"
            name="q"
            className="input py-2 text-sm"
            defaultValue={q ?? ''}
            placeholder="닉네임 또는 뒷자리"
          />
        </div>
        <button type="submit" className="btn-ghost btn-sm">
          찾기
        </button>
        {q && (
          <Link href="/admin/customers" className="btn-ghost btn-sm">
            전체보기
          </Link>
        )}
      </form>

      <details className="card">
        <summary className="cursor-pointer text-sm font-bold text-stone-700">
          고객 직접 등록하기
        </summary>
        <form action={createCustomer} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">닉네임</label>
            <input name="nickname" className="input" required maxLength={20} />
          </div>
          <div>
            <label className="label">휴대폰 뒷 4자리</label>
            <input
              name="phone_last4"
              className="input"
              inputMode="numeric"
              maxLength={4}
              required
            />
          </div>
          <div>
            <label className="label">기본 배달 주소 (선택)</label>
            <input name="address" className="input" maxLength={120} />
          </div>
          <div>
            <label className="label">메모 (선택)</label>
            <input name="memo" className="input" maxLength={200} />
          </div>
          <button type="submit" className="btn-primary sm:col-span-2">
            고객 등록
          </button>
        </form>
      </details>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">
          고객 목록 ({customers.length}명)
        </h2>

        {customers.length === 0 ? (
          <div className="card text-center text-sm text-stone-500">
            <p className="py-6">{q ? '검색 결과가 없습니다.' : '아직 등록된 고객이 없습니다.'}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {customers.map((c: any) => (
              <li key={c.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold">{c.nickname}</span>
                    <span className="text-sm text-stone-400">{c.phone_last4}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!c.has_pin && (
                      <span className="badge bg-sky-100 text-sky-800">비번 미설정</span>
                    )}
                    {c.pin_locked_until && new Date(c.pin_locked_until) > new Date() && (
                      <span className="badge bg-red-100 text-red-700">잠김</span>
                    )}
                    {c.unpaid_amount > 0 && (
                      <span className="badge bg-amber-100 text-amber-800">
                        미입금 {won(c.unpaid_amount)}
                      </span>
                    )}
                    <span className="badge bg-stone-100 text-stone-600">
                      {c.order_count}건 · {won(c.total_spent)}
                    </span>
                  </div>
                </div>

                <p className="mt-1 text-xs text-stone-500">
                  최근 주문 {c.last_order_date ? formatDate(c.last_order_date) : '없음'}
                  {!c.has_pin && ' · 첫 접속 때 본인이 비밀번호를 정합니다'}
                </p>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-stone-500">
                    정보 수정
                  </summary>
                  <form action={updateCustomer} className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={c.id} />
                    <div>
                      <label className="label text-xs">닉네임</label>
                      <input
                        name="nickname"
                        className="input py-2 text-sm"
                        defaultValue={c.nickname}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">뒷 4자리</label>
                      <input
                        name="phone_last4"
                        className="input py-2 text-sm"
                        inputMode="numeric"
                        maxLength={4}
                        defaultValue={c.phone_last4}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">기본 배달 주소</label>
                      <input
                        name="address"
                        className="input py-2 text-sm"
                        defaultValue={c.address ?? ''}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">메모</label>
                      <input
                        name="memo"
                        className="input py-2 text-sm"
                        defaultValue={c.memo ?? ''}
                      />
                    </div>
                    <button type="submit" className="btn-ghost btn-sm sm:col-span-2">
                      저장
                    </button>
                  </form>
                </details>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-stone-100 pt-2">
                  {c.memo ? (
                    <span className="truncate text-xs text-stone-500">메모: {c.memo}</span>
                  ) : (
                    <span />
                  )}
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {c.has_pin && (
                      <form action={resetCustomerPin}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="btn-ghost btn-sm">
                          비번 초기화
                        </button>
                      </form>
                    )}
                    <Link href={`/admin/orders?customer=${c.id}`} className="btn-ghost btn-sm">
                      주문 내역
                    </Link>
                    <Link
                      href={`/admin/orders/new?customer=${c.id}`}
                      className="btn-ghost btn-sm"
                    >
                      주문 넣기
                    </Link>
                    {c.order_count === 0 && (
                      <form action={deleteCustomer}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="btn-ghost btn-sm text-red-600">
                          삭제
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

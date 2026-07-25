import { createProduct, deleteProduct, toggleArchiveProduct, updateProduct } from '../../actions'
import { listProducts } from '@/lib/queries'
import { won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const products = await listProducts(true)
  const active = products.filter((p) => !p.is_archived)
  const archived = products.filter((p) => p.is_archived)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">품목함</h1>
        <p className="text-sm text-stone-500">
          여기 등록해두면 매일 판매목록 짤 때 클릭 몇 번으로 꺼내 쓸 수 있습니다.
        </p>
      </div>

      <form action={createProduct} className="card grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">품목명</label>
          <input name="name" className="input" placeholder="예) 참외" required maxLength={40} />
        </div>
        <div>
          <label className="label">단위</label>
          <input name="unit" className="input" defaultValue="개" maxLength={10} />
        </div>
        <div>
          <label className="label">기본가격</label>
          <input name="default_price" className="input" inputMode="numeric" placeholder="0" />
        </div>
        <div className="sm:col-span-3">
          <label className="label">분류 (선택)</label>
          <input name="category" className="input" placeholder="과일 / 채소 / 기타" maxLength={20} />
        </div>
        <button type="submit" className="btn-primary self-end">
          품목 추가
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">사용 중인 품목 ({active.length}개)</h2>
        {active.length === 0 ? (
          <div className="card text-center text-sm text-stone-500">
            <p className="py-6">등록된 품목이 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {active.map((p) => (
              <li key={p.id} className="card">
                <form action={updateProduct} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <div className="min-w-[9rem] flex-1">
                    <label className="label text-xs">품목명</label>
                    <input name="name" className="input py-2 text-sm" defaultValue={p.name} />
                  </div>
                  <div className="w-20">
                    <label className="label text-xs">단위</label>
                    <input name="unit" className="input py-2 text-sm" defaultValue={p.unit} />
                  </div>
                  <div className="w-28">
                    <label className="label text-xs">기본가격</label>
                    <input
                      name="default_price"
                      className="input py-2 text-sm"
                      inputMode="numeric"
                      defaultValue={p.default_price}
                    />
                  </div>
                  <div className="w-28">
                    <label className="label text-xs">분류</label>
                    <input
                      name="category"
                      className="input py-2 text-sm"
                      defaultValue={p.category ?? ''}
                    />
                  </div>
                  <button type="submit" className="btn-ghost btn-sm">
                    저장
                  </button>
                </form>
                <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
                  <span className="text-xs text-stone-400">
                    기본 {won(p.default_price)} / {p.unit}
                  </span>
                  <div className="flex gap-1.5">
                    <form action={toggleArchiveProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="btn-ghost btn-sm">
                        보관함으로
                      </button>
                    </form>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="btn-ghost btn-sm text-red-600">
                        삭제
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-bold text-stone-700">
            보관함 ({archived.length}개)
          </summary>
          <ul className="mt-3 space-y-1.5">
            {archived.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm"
              >
                <span className="truncate text-stone-500">
                  {p.name} <span className="text-xs">({won(p.default_price)}/{p.unit})</span>
                </span>
                <form action={toggleArchiveProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="btn-ghost btn-sm shrink-0">
                    다시 꺼내기
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

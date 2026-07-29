import CategorySelect from '@/components/CategorySelect'
import MoneyInput from '@/components/MoneyInput'
import ActiveProductsList from './ActiveProductsList'
import ImportProductsForm from './ImportProductsForm'
import { createProduct, toggleArchiveProduct } from '../../actions'
import { listProducts } from '@/lib/queries'
import { won } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const products = await listProducts(true)
  const active = products.filter((p) => !p.is_archived)
  const archived = products.filter((p) => p.is_archived)
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">품목함</h1>
          <p className="text-sm text-stone-500">
            여기 등록해두면 매일 판매목록 짤 때 클릭 몇 번으로 꺼내 쓸 수 있습니다.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a href="/api/admin/products-export" className="btn-ghost btn-sm shrink-0">
            엑셀 다운로드
          </a>
          <ImportProductsForm />
        </div>
      </div>

      <form action={createProduct} className="card grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label">품목명</label>
          <input name="name" className="input" placeholder="예) 참외" required maxLength={40} />
        </div>
        <div>
          <label className="label">기본가격</label>
          <MoneyInput name="default_price" className="input" placeholder="0" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">분류</label>
          <CategorySelect categories={categories} />
        </div>
        <button type="submit" className="btn-primary self-end">
          품목 추가
        </button>
      </form>

      {active.length === 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-stone-600">사용 중인 품목 (0개)</h2>
          <div className="card text-center text-sm text-stone-500">
            <p className="py-6">등록된 품목이 없습니다.</p>
          </div>
        </section>
      ) : (
        <ActiveProductsList products={active} categories={categories} />
      )}

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
                  {p.name} <span className="text-xs">({won(p.default_price)})</span>
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

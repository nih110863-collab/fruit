'use client'

import { startTransition, useMemo, useRef, useState } from 'react'
import MoneyInput from '@/components/MoneyInput'
import ImageUploader from '../ImageUploader'
import { bulkArchiveProducts, bulkDeleteProducts, bulkUpdateProducts, deleteProductImage } from '../../actions'
import { DEFAULT_CATEGORIES } from '@/lib/types'
import type { Product } from '@/lib/types'
import { won } from '@/lib/util'

const UNCATEGORIZED = '미분류'

/** 기본 분류 순서를 먼저, 그 외 분류는 가나다순, 분류 없는 품목은 맨 뒤로 */
function categoryRank(category: string): number {
  if (category === UNCATEGORIZED) return DEFAULT_CATEGORIES.length + 1
  const i = DEFAULT_CATEGORIES.indexOf(category)
  return i === -1 ? DEFAULT_CATEGORIES.length : i
}

type FieldRefs = {
  name: HTMLInputElement | null
  price: HTMLInputElement | null
  category: HTMLSelectElement | null
}

/**
 * 사용 중인 품목 목록. 각 카드의 값은 로컬 ref로만 들고 있다가, 상단 '저장'을
 * 누르면 화면에 보이는 모든 품목을 한 번에 저장한다 — 사진 업로더가 자체
 * <form>을 갖고 있어 전체를 하나의 form으로 감쌀 수 없기 때문이다.
 * '보관함으로'/'삭제'는 체크한 품목에만 적용된다.
 */
export default function ActiveProductsList({
  products,
  categories,
}: {
  products: Product[]
  categories: string[]
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const fieldRefs = useRef<Map<number, FieldRefs>>(new Map())

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).sort((a, b) =>
        a.localeCompare(b, 'ko'),
      ),
    [categories],
  )

  const groups = useMemo(() => {
    const byCategory = new Map<string, Product[]>()
    for (const p of products) {
      const category = p.category ?? UNCATEGORIZED
      if (!byCategory.has(category)) byCategory.set(category, [])
      byCategory.get(category)!.push(p)
    }
    return Array.from(byCategory.entries()).sort(([a], [b]) => categoryRank(a) - categoryRank(b))
  }, [products])

  function getRefs(id: number): FieldRefs {
    let refs = fieldRefs.current.get(id)
    if (!refs) {
      refs = { name: null, price: null, category: null }
      fieldRefs.current.set(id, refs)
    }
    return refs
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSave() {
    const entries = products
      .map((p) => {
        const refs = fieldRefs.current.get(p.id)
        if (!refs?.name || !refs.price || !refs.category) return null
        return { id: p.id, name: refs.name.value, price: refs.price.value, category: refs.category.value }
      })
      .filter((e): e is { id: number; name: string; price: string; category: string } => e !== null)
    startTransition(() => {
      bulkUpdateProducts(entries)
    })
  }

  function handleArchive() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    startTransition(() => {
      bulkArchiveProducts(ids)
    })
    setSelected(new Set())
  }

  function handleDelete() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    startTransition(() => {
      bulkDeleteProducts(ids)
    })
    setSelected(new Set())
  }

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-600">사용 중인 품목 ({products.length}개)</h2>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={handleArchive}
            disabled={selected.size === 0}
            className="btn-ghost btn-sm disabled:opacity-40"
          >
            보관함으로
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={selected.size === 0}
            className="btn-ghost btn-sm text-red-600 disabled:opacity-40"
          >
            삭제
          </button>
          <button type="button" onClick={handleSave} className="btn-primary btn-sm">
            저장
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-2 text-xs font-bold text-stone-500">
              {category} ({items.length}개)
            </h3>
            <ul className="space-y-2">
              {items.map((p) => (
                <li key={p.id} className="card flex gap-3">
                  <div className="flex shrink-0 items-start pt-1">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={`${p.name} 선택`}
                      className="size-4 accent-emerald-700"
                    />
                  </div>

                  <ImageUploader
                    productId={p.id}
                    productName={p.name}
                    hasImage={p.has_image}
                    version={p.image_version}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[9rem] flex-1">
                        <label className="label text-xs">품목명</label>
                        <input
                          ref={(el) => {
                            getRefs(p.id).name = el
                          }}
                          className="input py-2 text-sm"
                          defaultValue={p.name}
                        />
                      </div>
                      <div className="w-28">
                        <label className="label text-xs">기본가격</label>
                        <MoneyInput
                          ref={(el) => {
                            getRefs(p.id).price = el
                          }}
                          className="input py-2 text-sm"
                          defaultValue={p.default_price}
                        />
                      </div>
                      <div className="w-36">
                        <label className="label text-xs">분류</label>
                        <select
                          ref={(el) => {
                            getRefs(p.id).category = el
                          }}
                          className="input py-2 text-sm"
                          defaultValue={p.category ?? ''}
                        >
                          <option value="">없음</option>
                          {categoryOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2">
                      <span className="text-xs text-stone-400">기본 {won(p.default_price)}</span>
                      {p.has_image && (
                        <form action={deleteProductImage}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="btn-ghost btn-sm">
                            사진 삭제
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

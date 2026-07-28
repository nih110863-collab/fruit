'use client'

import { useEffect, useState } from 'react'
import { addProductsToDate } from '../../actions'
import { won } from '@/lib/util'

type Product = { id: number; name: string; default_price: number }

/** '품목함 바로가기' 옆에 붙는 버튼 — 누르면 팝업으로 품목함 품목을 골라 오늘 목록에 올린다. */
export default function PickFromInventoryButton({
  available,
  saleDate,
}: {
  available: Product[]
  saleDate: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm shrink-0">
        품목함에서 꺼내오기 ({available.length}개)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-stone-900/50"
          />

          <div className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
              <h2 className="text-base font-bold">품목함에서 꺼내오기</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-1 size-8 rounded-lg text-xl leading-none text-stone-400 hover:bg-stone-100"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {available.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-500">
                  품목함에 있는 품목이 모두 오늘 목록에 들어가 있습니다.
                </p>
              ) : (
                <form
                  action={addProductsToDate}
                  onSubmit={() => setOpen(false)}
                  className="space-y-3"
                >
                  <input type="hidden" name="sale_date" value={saleDate} />
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {available.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5 text-sm hover:bg-stone-50">
                          <input
                            type="checkbox"
                            name="product_ids"
                            value={p.id}
                            className="size-4 accent-emerald-700"
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                          <span className="shrink-0 text-xs text-stone-500">{won(p.default_price)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button type="submit" className="btn-primary w-full">
                    선택한 품목 목록에 올리기
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

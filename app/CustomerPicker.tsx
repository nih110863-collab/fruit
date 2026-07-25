'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { DirectoryEntry } from '@/lib/types'

export default function CustomerPicker({ customers }: { customers: DirectoryEntry[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return customers
    return customers.filter((c) => c.nickname.includes(q) || c.hint.includes(q))
  }, [query, customers])

  // 시트가 열려 있는 동안 뒤 페이지가 같이 스크롤되지 않게
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
            이름 선택하고 주문하기
          </button>
          <p className="mt-1.5 text-center text-xs text-stone-400">
            회원가입 없이 이름과 비밀번호 4자리로 주문합니다
          </p>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-stone-900/40"
          />

          <div className="relative mx-auto flex max-h-[82dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
              <h2 className="text-base font-bold">본인 이름을 눌러주세요</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-1 size-8 rounded-lg text-xl leading-none text-stone-400 hover:bg-stone-100"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {customers.length > 8 && (
              <div className="px-5 pb-3">
                <input
                  className="input py-2.5"
                  placeholder="이름으로 찾기"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  aria-label="이름으로 찾기"
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
              {filtered.length === 0 ? (
                <p className="rounded-xl bg-stone-100 px-4 py-8 text-center text-sm text-stone-500">
                  {query ? '찾는 이름이 없습니다.' : '아직 등록된 분이 없습니다.'}
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/enter/${c.id}`}
                        className="flex h-full flex-col justify-center rounded-2xl border border-stone-200 bg-white px-3 py-3.5 text-center transition active:scale-[0.98] hover:border-brand-500 hover:bg-brand-50"
                      >
                        <span className="truncate text-[15px] font-bold">{c.nickname}</span>
                        <span className="mt-0.5 text-xs text-stone-400">{c.hint}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 text-center text-xs text-stone-400">
                명단에 이름이 없으면 사장님께 말씀해주세요. 등록해드립니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

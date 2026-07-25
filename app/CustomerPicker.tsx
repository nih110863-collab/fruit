'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { DirectoryEntry } from '@/lib/types'

export default function CustomerPicker({ customers }: { customers: DirectoryEntry[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return customers
    return customers.filter((c) => c.nickname.includes(q) || c.hint.includes(q))
  }, [query, customers])

  return (
    <div className="space-y-3">
      {customers.length > 8 && (
        <input
          className="input"
          placeholder="이름으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-label="이름으로 찾기"
        />
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-stone-100 px-4 py-6 text-center text-sm text-stone-500">
          {query ? '찾는 이름이 없습니다.' : '아직 등록된 분이 없습니다.'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/enter/${c.id}`}
                className="flex h-full flex-col justify-center rounded-2xl border border-stone-200 bg-white px-4 py-4 text-center shadow-sm transition active:scale-[0.98] hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="truncate text-base font-bold">{c.nickname}</span>
                <span className="mt-0.5 text-xs text-stone-400">{c.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

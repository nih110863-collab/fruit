'use client'

import { useActionState, useEffect, useState } from 'react'
import { attachImageFromUrl, type FormState } from '../actions'

type Result = {
  id: string
  thumbnail: string
  url: string
  title: string
  creator: string | null
  license: string
  requiresAttribution: boolean
}

function PickThumbnail({
  productId,
  result,
  onPicked,
}: {
  productId: number
  result: Result
  onPicked: () => void
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(attachImageFromUrl, {})
  const [attempted, setAttempted] = useState(false)

  // 성공(에러 없이 완료)하면 모달을 닫아 원래 화면으로 돌아간다
  useEffect(() => {
    if (attempted && !isPending && !state.error) onPicked()
  }, [attempted, isPending, state.error, onPicked])

  return (
    <form
      action={formAction}
      onSubmit={() => setAttempted(true)}
      className="relative block overflow-hidden rounded-xl border border-stone-200"
    >
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="image_url" value={result.url} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={result.thumbnail}
        alt={result.title}
        loading="lazy"
        className="aspect-square w-full bg-stone-100 object-cover"
      />

      <span
        className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-bold text-white ${
          result.requiresAttribution ? 'bg-amber-600' : 'bg-emerald-600'
        }`}
      >
        {result.requiresAttribution ? `${result.license} · 출처표시` : result.license}
      </span>

      <button
        type="submit"
        disabled={isPending}
        className="absolute inset-x-0 bottom-0 bg-brand-600/95 py-1 text-[11px] font-bold text-white disabled:bg-stone-400"
      >
        {isPending ? '등록 중…' : '이 사진 쓰기'}
      </button>

      {state.error && (
        <p className="absolute inset-x-0 top-0 bg-red-600/95 px-1 py-0.5 text-center text-[9px] font-bold text-white">
          {state.error}
        </p>
      )}
    </form>
  )
}

export default function ImageSearchModal({
  productId,
  productName,
  onClose,
}: {
  productId: number
  productName: string
  onClose: () => void
}) {
  const [query, setQuery] = useState(productName)
  const [results, setResults] = useState<Result[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/image-search?q=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? '검색에 실패했습니다.')
      setResults(data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 문제가 생겼습니다.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // 처음 열릴 때 품목명으로 바로 한 번 검색해준다
  useEffect(() => {
    search(productName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-stone-900/50" />

      <div className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
          <h2 className="text-base font-bold">무료 이미지 검색</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 size-8 rounded-lg text-xl leading-none text-stone-400 hover:bg-stone-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            search(query)
          }}
          className="flex gap-1.5 px-5 pb-2"
        >
          <input
            className="input py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예) apple, tomato"
            autoFocus
          />
          <button type="submit" className="btn-primary btn-sm shrink-0" disabled={loading}>
            {loading ? '검색 중…' : '검색'}
          </button>
        </form>
        <p className="px-5 pb-3 text-[11px] text-stone-400">
          Openverse(무료 저작권 이미지) 검색입니다. 한글보다{' '}
          <b className="text-stone-500">영어로 검색</b>하면 결과가 훨씬 많이 나와요. (예: 사과 →
          apple)
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {error && (
            <p className="mb-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {!error && results?.length === 0 && !loading && (
            <p className="rounded-xl bg-stone-100 px-4 py-8 text-center text-sm text-stone-500">
              검색 결과가 없습니다. 다른 단어로 찾아보세요.
            </p>
          )}

          <ul className="grid grid-cols-3 gap-2">
            {(results ?? []).map((r) => (
              <li key={r.id}>
                <PickThumbnail productId={productId} result={r} onPicked={onClose} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

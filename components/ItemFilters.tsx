'use client'

export default function ItemFilters({
  categories,
  query,
  onQuery,
  category,
  onCategory,
  count,
}: {
  categories: string[]
  query: string
  onQuery: (v: string) => void
  category: string
  onCategory: (v: string) => void
  count: number
}) {
  return (
    <div className="space-y-2.5">
      <input
        className="input py-2.5"
        placeholder="품목 검색 (예: 사과)"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        autoComplete="off"
        aria-label="품목 검색"
      />

      {categories.length > 0 && (
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5">
          {['', ...categories].map((c) => (
            <button
              key={c || 'all'}
              type="button"
              onClick={() => onCategory(c)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                category === c
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-stone-300 bg-white text-stone-600'
              }`}
            >
              {c || '전체'}
            </button>
          ))}
        </div>
      )}

      {(query.trim() || category) && (
        <p className="text-xs text-stone-500">
          {count > 0 ? `${count}가지 찾았습니다` : '조건에 맞는 품목이 없습니다'}
        </p>
      )}
    </div>
  )
}

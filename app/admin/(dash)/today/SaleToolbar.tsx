'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { bulkClearSale, bulkSetSale } from '../../actions'
import MoneyInput from '@/components/MoneyInput'
import { HIGHLIGHTS } from '@/lib/types'

const SelectionContext = createContext<{
  selected: Set<number>
  toggle: (id: number) => void
  clear: () => void
} | null>(null)

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used inside <SaleSelectionProvider>')
  return ctx
}

function ApplyButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary btn-sm shrink-0" disabled={disabled || pending}>
      {pending ? '적용 중…' : '선택 품목에 적용'}
    </button>
  )
}

function ClearButton({
  disabled,
  formAction,
}: {
  disabled: boolean
  formAction: (formData: FormData) => void
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      formAction={formAction}
      className="btn-ghost btn-sm shrink-0"
      disabled={disabled || pending}
    >
      세일 해제
    </button>
  )
}

/**
 * 판매목록 상단 툴바. 아래 목록에서 체크한 품목들에 세일가·시간대·노출 구역을
 * 한 번에 적용한다. 선택된 게 없으면 접혀 있는 안내만 보인다.
 */
export function SaleSelectionProvider({
  items,
  children,
}: {
  items: { id: number; name: string }[]
  children: React.ReactNode
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const clear = () => setSelected(new Set())
  const selectAll = () => setSelected(new Set(items.map((i) => i.id)))

  const ids = useMemo(() => Array.from(selected), [selected])
  const names = useMemo(
    () => items.filter((i) => selected.has(i.id)).map((i) => i.name),
    [items, selected],
  )

  return (
    <SelectionContext.Provider value={{ selected, toggle, clear }}>
      <details className="group card space-y-3 border-brand-200 bg-brand-50/40">
        <summary className="flex list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="cursor-pointer text-sm font-bold text-stone-700">
            <span className="inline-block transition-transform group-open:rotate-90">▶</span>{' '}
            세일 · 노출 구역 일괄 설정{selected.size > 0 && ` (${selected.size}개 선택됨)`}
          </span>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                selectAll()
              }}
              className="btn-ghost btn-sm"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                clear()
              }}
              disabled={selected.size === 0}
              className="btn-ghost btn-sm disabled:opacity-40"
            >
              선택 해제
            </button>
          </div>
        </summary>

        <p className="text-xs text-stone-500">
          {selected.size === 0
            ? '아래 목록에서 품목을 체크하면 여기서 한 번에 세일을 걸 수 있습니다.'
            : names.join(', ')}
        </p>

        <form
          action={bulkSetSale}
          onSubmit={() => setTimeout(clear, 0)}
          className="flex flex-wrap items-end gap-2"
        >
          {ids.map((id) => (
            <input key={id} type="hidden" name="daily_item_ids" value={id} />
          ))}

          <label className="w-24">
            <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">세일가</span>
            <MoneyInput name="sale_price" className="input px-2 py-1.5 text-sm" placeholder="예: 3500" />
          </label>
          <label className="w-24">
            <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">시작</span>
            <input type="time" name="sale_from" className="input px-2 py-1.5 text-sm" />
          </label>
          <label className="w-20">
            <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">몇 시간</span>
            <input
              name="sale_hours"
              className="input px-2 py-1.5 text-sm"
              inputMode="numeric"
              placeholder="예: 3"
            />
          </label>
          <label className="w-32">
            <span className="mb-0.5 block text-[11px] font-semibold text-stone-500">노출 구역</span>
            <select name="highlight" className="input px-2 py-1.5 text-sm" defaultValue="">
              <option value="">일반</option>
              {HIGHLIGHTS.map((h) => (
                <option key={h.key} value={h.key}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>

          <ApplyButton disabled={selected.size === 0} />
          <ClearButton disabled={selected.size === 0} formAction={bulkClearSale} />
        </form>

        <p className="text-[11px] text-stone-400">
          시작 시간을 비우면 하루 종일 세일가로 팝니다. 시작 시간만 정하고 몇 시간을 비우면
          시작 후 계속 진행됩니다(끝 시간 없음). 세일가를 비우고 적용하면 정가로 돌아갑니다.
        </p>
      </details>

      {children}
    </SelectionContext.Provider>
  )
}

export function ItemCheckbox({ id, label }: { id: number; label: string }) {
  const { selected, toggle } = useSelection()
  return (
    <label className="flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        checked={selected.has(id)}
        onChange={() => toggle(id)}
        aria-label={`${label} 세일 설정에 포함`}
        className="size-4 accent-emerald-700"
      />
    </label>
  )
}

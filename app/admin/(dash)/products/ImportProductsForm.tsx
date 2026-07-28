'use client'

import { useActionState } from 'react'
import { importProducts, type FormState } from '../../actions'

export default function ImportProductsForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(importProducts, {})

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        type="file"
        name="file"
        accept=".csv"
        required
        className="text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-stone-100
                   file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-stone-700
                   hover:file:bg-stone-200"
      />
      <button type="submit" className="btn-ghost btn-sm shrink-0" disabled={isPending}>
        {isPending ? '올리는 중…' : '엑셀 업로드'}
      </button>
      {state.message && <span className="text-xs font-semibold text-brand-700">{state.message}</span>}
      {state.error && <span className="text-xs font-semibold text-red-600">{state.error}</span>}
    </form>
  )
}

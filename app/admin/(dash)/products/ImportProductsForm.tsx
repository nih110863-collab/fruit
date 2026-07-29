'use client'

import { useActionState, useRef } from 'react'
import { importProducts, type FormState } from '../../actions'

/** 버튼을 누르면 바로 OS 파일 선택창이 뜨고, 파일을 고르면 곧장 업로드된다. */
export default function ImportProductsForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(importProducts, {})
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="contents">
      <form ref={formRef} action={formAction} className="hidden">
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".csv"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </form>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn-ghost btn-sm shrink-0"
        disabled={isPending}
      >
        {isPending ? '올리는 중…' : '엑셀 업로드'}
      </button>
      {state.message && <span className="text-xs font-semibold text-brand-700">{state.message}</span>}
      {state.error && <span className="text-xs font-semibold text-red-600">{state.error}</span>}
    </div>
  )
}

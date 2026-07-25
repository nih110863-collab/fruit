'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { adminLogin, type FormState } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? '확인 중…' : '로그인'}
    </button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useActionState<FormState, FormData>(adminLogin, {})

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          관리자 비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}

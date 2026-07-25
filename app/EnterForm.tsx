'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { enterShop, type FormState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? '확인 중…' : '주문하러 가기'}
    </button>
  )
}

export default function EnterForm() {
  const [state, formAction] = useActionState<FormState, FormData>(enterShop, {})

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="nickname">
          닉네임 (이름)
        </label>
        <input
          id="nickname"
          name="nickname"
          className="input"
          placeholder="예) 301호 민지엄마"
          autoComplete="off"
          maxLength={20}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="phone_last4">
          휴대폰 뒷 4자리
        </label>
        <input
          id="phone_last4"
          name="phone_last4"
          className="input tracking-[0.3em]"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="1234"
          maxLength={4}
          autoComplete="off"
          required
        />
        <p className="mt-1.5 text-xs text-stone-500">
          가입 절차 없이 이 두 가지로 주문 내역을 찾습니다.
        </p>
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

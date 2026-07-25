'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createPin, enterWithPin, type FormState } from '../../actions'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function PinPad({
  customerId,
  nickname,
  mode,
}: {
  customerId: number
  nickname: string
  mode: 'verify' | 'create'
}) {
  const action = mode === 'create' ? createPin : enterWithPin
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, {})

  const [digits, setDigits] = useState('')
  const [first, setFirst] = useState('')
  const [step, setStep] = useState<'new' | 'confirm'>('new')
  const formRef = useRef<HTMLFormElement>(null)
  // 같은 입력으로 두 번 제출되지 않도록 (제출 결과가 돌아온 뒤 effect가 다시 도는 것을 막는다)
  const submittedRef = useRef<string | null>(null)

  // 4자리가 채워지면 알아서 넘어간다 (확인 버튼을 따로 누를 필요 없음)
  useEffect(() => {
    if (digits.length !== 4) {
      submittedRef.current = null
      return
    }
    if (isPending || submittedRef.current === digits) return

    if (mode === 'verify' || step === 'confirm') {
      submittedRef.current = digits
      formRef.current?.requestSubmit()
    } else {
      setFirst(digits)
      setDigits('')
      setStep('confirm')
    }
  }, [digits, isPending, mode, step])

  // 틀렸으면 지우고 처음부터
  useEffect(() => {
    if (!state.error) return
    setDigits('')
    if (mode === 'create') {
      setFirst('')
      setStep('new')
    }
  }, [state, mode])

  function press(key: string) {
    if (isPending) return
    if (key === '⌫') return setDigits((d) => d.slice(0, -1))
    if (!key) return
    setDigits((d) => (d.length >= 4 ? d : d + key))
  }

  const title =
    mode === 'verify'
      ? '비밀번호 4자리'
      : step === 'new'
        ? '사용하실 비밀번호 4자리를 정해주세요'
        : '확인을 위해 한 번 더 눌러주세요'

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="pin" value={mode === 'create' && step === 'confirm' ? first : digits} />
      {mode === 'create' && <input type="hidden" name="pin_confirm" value={digits} />}

      <div className="text-center">
        <p className="text-2xl font-bold">{nickname}</p>
        <p className="mt-1.5 text-sm text-stone-500">{title}</p>
      </div>

      <div className="flex justify-center gap-3.5" aria-label={`${digits.length}자리 입력됨`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`size-4 rounded-full transition ${
              i < digits.length ? 'bg-brand-600' : 'bg-stone-300'
            }`}
          />
        ))}
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-center text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              disabled={isPending}
              className={`h-16 rounded-2xl text-2xl font-bold transition active:scale-95 disabled:opacity-40 ${
                key === '⌫'
                  ? 'text-stone-500 hover:bg-stone-100'
                  : 'border border-stone-200 bg-white shadow-sm hover:bg-stone-50'
              }`}
            >
              {key}
            </button>
          ),
        )}
      </div>

      {isPending && <p className="text-center text-sm text-stone-400">확인 중…</p>}
    </form>
  )
}

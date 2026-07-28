'use client'

import { useState } from 'react'

function formatWithCommas(v: string): string {
  const digits = v.replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('ko-KR')
}

/** 입력하는 동안 천 단위 콤마를 붙여 보여준다. 제출값의 콤마는 서버에서 걸러낸다. */
export default function MoneyInput({
  name,
  defaultValue,
  className,
  placeholder,
  required,
}: {
  name: string
  defaultValue?: number | string
  className?: string
  placeholder?: string
  required?: boolean
}) {
  const [value, setValue] = useState(() =>
    defaultValue !== undefined && defaultValue !== '' ? formatWithCommas(String(defaultValue)) : '',
  )

  return (
    <input
      name={name}
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={(e) => setValue(formatWithCommas(e.target.value))}
    />
  )
}

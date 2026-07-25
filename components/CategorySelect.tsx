'use client'

import { useState } from 'react'
import { DEFAULT_CATEGORIES } from '@/lib/types'

const CUSTOM = '__custom__'

/**
 * 분류 선택 — 기본 음식 분류 + 이미 등록해둔 분류를 드롭다운으로 보여준다.
 * '+ 새 분류 직접 입력' 을 고르면 입력칸으로 바뀌고, 거기 적은 값이 다음부터
 * 드롭다운에 자동으로 들어간다 (품목 저장 시 products.category 에 그대로 남으므로).
 */
export default function CategorySelect({
  name = 'category',
  categories,
  defaultValue = '',
  required = false,
}: {
  name?: string
  categories: string[]
  defaultValue?: string
  required?: boolean
}) {
  const options = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).sort((a, b) =>
    a.localeCompare(b, 'ko'),
  )
  const known = !defaultValue || options.includes(defaultValue)
  const [custom, setCustom] = useState(!known)

  if (custom) {
    return (
      <div className="flex gap-1.5">
        <input
          name={name}
          className="input"
          placeholder="새 분류 이름"
          defaultValue={known ? '' : defaultValue}
          required={required}
          maxLength={20}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setCustom(false)}
          className="btn-ghost btn-sm shrink-0"
        >
          목록에서 고르기
        </button>
      </div>
    )
  }

  return (
    <select
      name={name}
      className="input"
      defaultValue={defaultValue}
      required={required}
      onChange={(e) => {
        if (e.target.value === CUSTOM) setCustom(true)
      }}
    >
      {!required && <option value="">없음</option>}
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={CUSTOM}>+ 새 분류 직접 입력</option>
    </select>
  )
}

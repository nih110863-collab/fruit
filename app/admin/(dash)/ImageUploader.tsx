'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateProductImage, type FormState } from '../actions'
import { productImageUrl } from '@/lib/image'

const MAX_SIDE = 900
const QUALITY = 0.82

/** 정사각형으로 가운데를 잘라 축소한 JPEG dataURL 을 만든다 */
async function toSquareJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const out = Math.min(side, MAX_SIDE)

  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 사용 불가')

  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    out,
    out,
  )
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', QUALITY)
}

export default function ImageUploader({
  productId,
  productName,
  hasImage,
  version,
}: {
  productId: number
  productName: string
  hasImage: boolean
  version: number
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateProductImage, {})
  const [preview, setPreview] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 사진을 고르면 바로 줄여서 올린다
  useEffect(() => {
    if (preview) formRef.current?.requestSubmit()
  }, [preview])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalError(null)
    try {
      setPreview(await toSquareJpeg(file))
    } catch {
      setLocalError('사진을 읽지 못했습니다. 다른 사진으로 해보세요.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const shown = preview ?? (hasImage ? productImageUrl(productId, version) : null)
  const error = localError ?? state.error

  return (
    <form ref={formRef} action={formAction} className="shrink-0">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="image" value={preview ?? ''} />

      <label className="block cursor-pointer">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onPick}
          disabled={isPending}
        />
        <span className="relative block size-20 overflow-hidden rounded-xl border border-stone-200">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={productName} className="size-full object-cover" />
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-0.5 bg-stone-50 text-stone-400">
              <span className="text-lg leading-none">＋</span>
              <span className="text-[10px] font-semibold">사진</span>
            </span>
          )}
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] font-semibold text-stone-600">
              올리는 중…
            </span>
          )}
        </span>
      </label>

      {error && <p className="mt-1 w-20 text-[10px] leading-tight text-red-600">{error}</p>}
    </form>
  )
}

'use client'

import ProductImage from './ProductImage'
import type { DailyItem } from '@/lib/types'

/**
 * 고객 화면 품목 카드 (3열 배치용 압축 레이아웃).
 * 배지는 세로 길이를 아끼려고 전부 사진 위에 얹는다.
 * onChange 를 주면 수량 조절 버튼이 붙고, 없으면 보기 전용(첫 화면)이 된다.
 */
export default function ItemCard({
  item,
  qty = 0,
  onChange,
}: {
  item: DailyItem
  qty?: number
  onChange?: (delta: number) => void
}) {
  const soldOut = item.remaining === 0
  // 담은 만큼 즉시 줄여서 보여준다 (수량 제한이 없으면 null)
  const left = item.remaining === null ? null : Math.max(0, item.remaining - qty)
  const onSale = item.sale_active

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
        qty > 0 ? 'border-brand-500 ring-1 ring-brand-500' : 'border-stone-200'
      }`}
    >
      <div className="relative">
        <ProductImage
          productId={item.product_id}
          version={item.image_version}
          hasImage={item.has_image}
          name={item.name}
          className="aspect-square w-full"
          sizes="(max-width: 448px) 30vw, 140px"
        />

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50">
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-stone-700">
              마감
            </span>
          </div>
        )}

        {!soldOut && (onSale || item.sale_upcoming) && (
          <span
            className={`absolute left-1 top-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow ${
              onSale ? 'bg-red-600' : 'bg-stone-700'
            }`}
          >
            {onSale ? (item.sale_to ? `~${item.sale_to}` : '세일') : `${item.sale_from}~`}
          </span>
        )}

        {qty > 0 && (
          <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white shadow">
            {qty}
          </span>
        )}

        {!soldOut && left !== null && (
          <span
            className={`absolute inset-x-1 bottom-1 rounded-md px-1 py-0.5 text-center text-[10px] font-bold tabular-nums ${
              left <= 3 ? 'bg-amber-500 text-white' : 'bg-white/90 text-stone-600'
            }`}
          >
            {left}개 남음
          </span>
        )}
      </div>

      <div className="p-1.5">
        <p
          className={`truncate text-[13px] font-bold leading-tight ${
            soldOut ? 'text-stone-400' : 'text-stone-900'
          }`}
        >
          {item.name}
        </p>

        <p className="mt-0.5 truncate text-[11px] leading-tight text-stone-500">
          {onSale && (
            <span className="mr-0.5 text-[10px] text-stone-400 line-through">
              {item.price.toLocaleString('ko-KR')}
            </span>
          )}
          <span className={`font-bold ${onSale ? 'text-red-600' : 'text-stone-800'}`}>
            {item.effective_price.toLocaleString('ko-KR')}원
          </span>
        </p>

        {onChange && (
          <div className="mt-1.5 flex items-center justify-between gap-0.5">
            <button
              type="button"
              onClick={() => onChange(-1)}
              disabled={qty === 0}
              aria-label={`${item.name} 수량 줄이기`}
              className="size-7 rounded-md border border-stone-300 text-base font-bold leading-none text-stone-600 disabled:opacity-30"
            >
              −
            </button>
            <span
              className={`min-w-4 text-center text-sm font-bold tabular-nums ${
                qty > 0 ? 'text-brand-700' : 'text-stone-300'
              }`}
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => onChange(1)}
              disabled={soldOut || (item.remaining !== null && qty >= item.remaining)}
              aria-label={`${item.name} 수량 늘리기`}
              className="size-7 rounded-md border border-brand-500 bg-brand-50 text-base font-bold leading-none text-brand-700 disabled:border-stone-300 disabled:bg-white disabled:text-stone-300"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

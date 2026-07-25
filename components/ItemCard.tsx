'use client'

import ProductImage from './ProductImage'
import type { DailyItem } from '@/lib/types'

/**
 * 고객 화면 품목 카드.
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
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
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
          sizes="(max-width: 448px) 45vw, 200px"
        />

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/45">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-stone-700">
              오늘 마감
            </span>
          </div>
        )}

        {!soldOut && (
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {onSale && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                {item.sale_to ? `${item.sale_to}까지 세일` : '세일중'}
              </span>
            )}
            {item.sale_upcoming && (
              <span className="rounded-full bg-stone-700 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                {item.sale_from}부터 세일
              </span>
            )}
            {item.limit_qty !== null && (
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-stone-600 shadow">
                한정 {item.limit_qty}
                {item.unit}
              </span>
            )}
          </div>
        )}

        {qty > 0 && (
          <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow">
            {qty}
          </span>
        )}
      </div>

      <div className="p-2.5">
        <p className={`truncate text-sm font-bold ${soldOut ? 'text-stone-400' : 'text-stone-900'}`}>
          {item.name}
        </p>

        <p className="mt-0.5 text-sm text-stone-500">
          {onSale && (
            <span className="mr-1 text-xs text-stone-400 line-through">
              {item.price.toLocaleString('ko-KR')}
            </span>
          )}
          <span className={`font-semibold ${onSale ? 'text-red-600' : 'text-stone-800'}`}>
            {item.effective_price.toLocaleString('ko-KR')}원
          </span>{' '}
          / {item.unit}
        </p>

        {/* 수량 제한 품목은 담는 만큼 남은 개수가 오른쪽에서 줄어든다 */}
        <div className="mt-1 flex h-5 items-center justify-end">
          {left !== null && (
            <span
              className={`text-xs font-bold tabular-nums ${
                left === 0 ? 'text-stone-400' : left <= 3 ? 'text-amber-600' : 'text-stone-500'
              }`}
            >
              {left === 0 ? (
                qty > 0 ? '남은 수량 없음' : '마감'
              ) : (
                <>
                  남은 수량 {left}
                  {item.unit}
                </>
              )}
            </span>
          )}
        </div>

        {onChange && (
          <div className="mt-1 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => onChange(-1)}
              disabled={qty === 0}
              aria-label={`${item.name} 수량 줄이기`}
              className="size-9 rounded-lg border border-stone-300 text-lg font-bold text-stone-600 disabled:opacity-30"
            >
              −
            </button>
            <span
              className={`min-w-6 text-center text-base font-bold tabular-nums ${
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
              className="size-9 rounded-lg border border-brand-500 bg-brand-50 text-lg font-bold text-brand-700 disabled:border-stone-300 disabled:bg-white disabled:text-stone-300"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

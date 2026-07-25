import { productImageUrl } from '@/lib/image'

/** 사진이 없으면 이름 첫 글자를 보여주는 자리표시자 */
export default function ProductImage({
  productId,
  version,
  hasImage,
  name,
  className = '',
  sizes,
}: {
  productId: number
  version: number
  hasImage: boolean
  name: string
  className?: string
  sizes?: string
}) {
  if (!hasImage) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 text-stone-300 ${className}`}
        aria-label={`${name} 사진 없음`}
      >
        <span className="text-[2em] font-bold leading-none">{name.trim().charAt(0)}</span>
      </div>
    )
  }

  return (
    // 원본이 이미 정사각형 축소본이라 next/image 최적화 없이 그대로 쓴다
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={productImageUrl(productId, version)}
      alt={name}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      className={`bg-stone-100 object-cover ${className}`}
    />
  )
}

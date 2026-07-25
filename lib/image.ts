/** 품목 사진 URL. 버전을 붙여 캐시를 무효화한다. */
export function productImageUrl(productId: number, version: number): string {
  return `/api/products/${productId}/image?v=${version}`
}

import 'server-only'

export type ImageSearchResult = {
  id: string
  thumbnail: string
  url: string
  title: string
  creator: string | null
  license: string
  /** CC0 · 퍼블릭도메인이 아니면 출처 표시가 필요한 라이선스 */
  requiresAttribution: boolean
}

const FREE_ATTRIBUTION = new Set(['CC0', 'PDM'])

/**
 * Openverse(openverse.org) 무료 이미지 검색 — CC 라이선스 이미지를 모아둔
 * 공개 API로, 별도 가입이나 키 없이 바로 쓸 수 있다.
 * 상업적 이용 + 가공(자르기/축소)이 허용된 라이선스만 가져온다.
 */
export async function searchFreeImages(query: string): Promise<ImageSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const url = new URL('https://api.openverse.org/v1/images/')
  url.searchParams.set('q', q)
  url.searchParams.set('license_type', 'commercial,modification')
  url.searchParams.set('page_size', '15')
  url.searchParams.set('mature', 'false')

  const res = await fetch(url, {
    headers: { 'User-Agent': 'fruit-shop-admin/1.0 (small grocery order app)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`이미지 검색 요청이 실패했습니다 (${res.status})`)

  const data = await res.json()
  const results = Array.isArray(data?.results) ? data.results : []

  return results
    .filter((r: any) => r?.thumbnail && r?.url)
    .slice(0, 15)
    .map((r: any) => {
      const license = String(r.license ?? '').toUpperCase()
      return {
        id: String(r.id),
        thumbnail: String(r.thumbnail),
        url: String(r.url),
        title: String(r.title ?? query).slice(0, 80),
        creator: r.creator ? String(r.creator).slice(0, 40) : null,
        license,
        requiresAttribution: !FREE_ATTRIBUTION.has(license),
      }
    })
}

// 다운로드 전 원본 용량 상한 (리사이즈 전 기준 — 흔한 스마트폰 사진도 넉넉히 들어오게)
const MAX_DOWNLOAD_BYTES = 12_000_000
const MAX_SIDE = 900
const QUALITY = 82

/**
 * 검색 결과의 원본 URL을 서버가 직접 내려받아(브라우저가 아니므로 CORS 문제 없음),
 * 직접 올리는 사진과 똑같이 정사각형 900px JPEG 으로 줄인다.
 */
export async function downloadImage(
  imageUrl: string,
): Promise<{ base64: string; contentType: string }> {
  const parsed = new URL(imageUrl)
  if (parsed.protocol !== 'https:') throw new Error('이미지 주소가 올바르지 않습니다.')

  const res = await fetch(parsed, {
    headers: { 'User-Agent': 'fruit-shop-admin/1.0 (small grocery order app)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error('이미지를 받아오지 못했습니다.')

  const contentType = res.headers.get('content-type') ?? ''
  if (!/^image\/(jpeg|png|webp)/.test(contentType)) {
    throw new Error('지원하지 않는 이미지 형식입니다.')
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error('이미지 용량이 너무 큽니다.')
  }

  const sharp = (await import('sharp')).default
  const resized = await sharp(buffer)
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: QUALITY })
    .toBuffer()

  return { base64: resized.toString('base64'), contentType: 'image/jpeg' }
}

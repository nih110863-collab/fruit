import { sql } from '@/lib/db'

/**
 * 품목 사진 서빙.
 * URL 에 ?v=<image_version> 을 붙여 부르므로 응답을 영구 캐시해도 안전하다.
 * (사진을 바꾸면 version 이 올라가 URL 이 바뀌고, CDN 이 새로 받아간다)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const productId = Number(id)
  if (!Number.isInteger(productId)) return new Response('Not found', { status: 404 })

  const rows = await sql`
    select image_data, image_type from products where id = ${productId} limit 1
  `
  const row = rows[0]
  if (!row?.image_data) return new Response('Not found', { status: 404 })

  // 드라이버에 따라 Buffer 또는 '\x..' 형태의 hex 문자열로 온다
  const raw = row.image_data
  const bytes =
    typeof raw === 'string'
      ? Uint8Array.from(Buffer.from(raw.replace(/^\\x/, ''), 'hex'))
      : Uint8Array.from(raw as Buffer)

  return new Response(bytes, {
    headers: {
      'Content-Type': row.image_type || 'image/jpeg',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

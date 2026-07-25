import { isAdmin } from '@/lib/auth'
import { searchFreeImages } from '@/lib/imageSearch'

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })

  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (!q.trim()) return Response.json({ results: [] })

  try {
    const results = await searchFreeImages(q)
    return Response.json({ results })
  } catch (err) {
    console.error('image search failed', err)
    return Response.json({ error: '검색 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 })
  }
}

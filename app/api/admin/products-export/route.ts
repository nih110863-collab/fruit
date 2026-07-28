import { isAdmin } from '@/lib/auth'
import { toCsv } from '@/lib/csv'
import { listProducts } from '@/lib/queries'
import { todayKST } from '@/lib/util'

/** 품목함 전체를 엑셀(CSV)로 내려받는다. 그대로 수정해서 다시 올리면 일괄 반영된다. */
export async function GET() {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })

  const products = await listProducts(true)
  const csv = toCsv([
    ['품목명', '기본가격', '분류', '보관여부'],
    ...products.map((p) => [p.name, p.default_price, p.category ?? '', p.is_archived ? '보관됨' : '']),
  ])

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다
  const BOM = '﻿'

  return new Response(BOM + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products_${todayKST()}.csv"`,
    },
  })
}

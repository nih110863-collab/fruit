import { isAdmin } from '@/lib/auth'
import { toCsv } from '@/lib/csv'
import { dailySalesRange, productSalesRange } from '@/lib/queries'

function isValidDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** 매출 통계 화면의 기간을 그대로 CSV로 내려받는다 (일별 판매현황 + 품목별 판매현황). */
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (!isValidDate(from) || !isValidDate(to)) {
    return new Response('잘못된 날짜입니다.', { status: 400 })
  }

  const [daily, products] = await Promise.all([dailySalesRange(from, to), productSalesRange(from, to)])

  const dailyCsv = toCsv([
    ['날짜', '주문건수', '매출', '미입금'],
    ...daily.map((d) => [d.sale_date, d.order_count, d.revenue, d.unpaid]),
  ])
  const productCsv = toCsv([
    ['품목명', '판매수량', '매출', '주문건수'],
    ...products.map((p) => [p.product_name, p.qty, p.revenue, p.order_count]),
  ])

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다
  const BOM = '﻿'
  const body = BOM + dailyCsv + '\r\n\r\n' + productCsv

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales_${from}_${to}.csv"`,
    },
  })
}

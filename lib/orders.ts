import 'server-only'
import { withTx } from './db'
import type { CartLine } from './types'

export type SaveOrderInput = {
  /** 있으면 수정, 없으면 신규 */
  orderId?: number
  customerId: number
  saleDate: string
  lines: CartLine[]
  fulfillment: 'pickup' | 'delivery'
  pickupTime?: string | null
  address?: string | null
  memo?: string | null
  source: 'customer' | 'admin'
}

export type SaveOrderResult = { ok: true; orderId: number } | { ok: false; error: string }

/**
 * 주문 저장. 수량 제한 품목이 있으므로 반드시 트랜잭션 안에서
 * daily_items 행을 잠근 뒤 남은 수량을 다시 세고 검증한다.
 * (두 사람이 동시에 마지막 1개를 담아도 한 명만 성공)
 */
export async function saveOrder(input: SaveOrderInput): Promise<SaveOrderResult> {
  const lines = input.lines.filter((l) => l.qty > 0)
  if (!lines.length) return { ok: false, error: '주문할 품목을 1개 이상 선택해주세요.' }

  const ids = lines.map((l) => l.dailyItemId)
  if (new Set(ids).size !== ids.length) return { ok: false, error: '같은 품목이 중복되었습니다.' }

  try {
    return await withTx(async (q) => {
      // 1) 대상 품목 잠금
      // 가격은 화면에서 받은 값을 믿지 않고, 세일 시간대까지 따져 여기서 다시 계산한다
      const items = await q(
        `select di.id,
                case when di.sale_price is not null
                      and (di.sale_starts_at is null or now() >= di.sale_starts_at)
                      and (di.sale_ends_at is null or now() < di.sale_ends_at)
                     then di.sale_price else di.price end as price,
                di.limit_qty, di.is_active, di.product_id, p.name, p.unit
           from daily_items di
           join products p on p.id = di.product_id
          where di.id = any($1::int[]) and di.sale_date = $2::date
          order by di.id
          for update of di`,
        [ids, input.saleDate],
      )
      if (items.length !== ids.length) {
        return { ok: false as const, error: '판매가 끝났거나 목록에서 내려간 품목이 있습니다. 새로고침 해주세요.' }
      }

      // 2) 현재까지 확정된 주문 수량 (수정 중인 주문 본인은 제외)
      const counts = await q(
        `select oi.daily_item_id, coalesce(sum(oi.qty), 0)::int as qty
           from order_items oi
           join orders o on o.id = oi.order_id
          where oi.daily_item_id = any($1::int[])
            and o.status = 'confirmed'
            and ($2::int is null or o.id <> $2::int)
          group by oi.daily_item_id`,
        [ids, input.orderId ?? null],
      )
      const ordered = new Map<number, number>(counts.map((c: any) => [c.daily_item_id, c.qty]))

      // 3) 검증
      const byId = new Map<number, any>(items.map((i: any) => [i.id, i]))
      for (const line of lines) {
        const item = byId.get(line.dailyItemId)!
        if (!item.is_active) {
          return { ok: false as const, error: `'${item.name}' 은(는) 지금 주문할 수 없습니다.` }
        }
        if (item.limit_qty !== null) {
          const left = item.limit_qty - (ordered.get(item.id) ?? 0)
          if (line.qty > left) {
            return {
              ok: false as const,
              error:
                left <= 0
                  ? `'${item.name}' 은(는) 마감되었습니다.`
                  : `'${item.name}' 은(는) ${left}개만 남았습니다.`,
            }
          }
        }
      }

      const total = lines.reduce((sum, l) => sum + byId.get(l.dailyItemId)!.price * l.qty, 0)

      // 4) 저장
      let orderId: number
      if (input.orderId) {
        const rows = await q(
          `update orders
              set sale_date = $2::date, fulfillment = $3, pickup_time = $4,
                  address = $5, memo = $6, total_amount = $7
            where id = $1 and status = 'confirmed'
            returning id`,
          [
            input.orderId,
            input.saleDate,
            input.fulfillment,
            input.pickupTime || null,
            input.address || null,
            input.memo || null,
            total,
          ],
        )
        if (!rows.length) return { ok: false as const, error: '취소되었거나 없는 주문입니다.' }
        orderId = rows[0].id
        await q(`delete from order_items where order_id = $1`, [orderId])
      } else {
        const rows = await q(
          `insert into orders (customer_id, sale_date, fulfillment, pickup_time, address, memo, total_amount, source)
           values ($1, $2::date, $3, $4, $5, $6, $7, $8)
           returning id`,
          [
            input.customerId,
            input.saleDate,
            input.fulfillment,
            input.pickupTime || null,
            input.address || null,
            input.memo || null,
            total,
            input.source,
          ],
        )
        orderId = rows[0].id
      }

      for (const line of lines) {
        const item = byId.get(line.dailyItemId)!
        await q(
          `insert into order_items (order_id, daily_item_id, product_id, product_name, unit, unit_price, qty, amount)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [orderId, item.id, item.product_id, item.name, item.unit, item.price, line.qty, item.price * line.qty],
        )
      }

      return { ok: true as const, orderId }
    })
  } catch (err) {
    console.error('saveOrder failed', err)
    return { ok: false, error: '주문 저장 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.' }
  }
}

import 'server-only'
import { sql } from './db'
import { toDateString } from './util'
import type { Customer, DailyItem, DirectoryEntry, Order, OrderItem, Product } from './types'

/* ---------- 품목 마스터 ---------- */

// 사진 원본(bytea)은 목록 조회에서 절대 끌고 오지 않는다 — 있는지 여부만 본다
export async function listProducts(includeArchived = false): Promise<Product[]> {
  const rows = await sql`
    select id, name, unit, default_price, category, is_archived,
           (image_data is not null) as has_image, image_version
      from products
     where ${includeArchived} = true or is_archived = false
     order by is_archived, category nulls last, name
  `
  return rows as Product[]
}

/* ---------- 판매일별 목록 ---------- */

export async function listDailyItems(saleDate: string, onlyActive = false): Promise<DailyItem[]> {
  const rows = await sql`
    select di.id,
           di.product_id,
           p.name,
           p.unit,
           p.category,
           di.price,
           di.limit_qty,
           di.sort_order,
           di.is_active,
           (p.image_data is not null) as has_image,
           p.image_version,
           coalesce(sum(oi.qty) filter (where o.status = 'confirmed'), 0)::int as ordered_qty
    from daily_items di
    join products p on p.id = di.product_id
    left join order_items oi on oi.daily_item_id = di.id
    left join orders o on o.id = oi.order_id
    where di.sale_date = ${saleDate}
      and (${onlyActive} = false or di.is_active = true)
    group by di.id, p.id
    order by di.sort_order, p.name
  `
  return (rows as any[]).map((r) => ({
    ...r,
    remaining: r.limit_qty === null ? null : Math.max(0, r.limit_qty - r.ordered_qty),
  })) as DailyItem[]
}

/** 오늘 목록을 짤 때 "지난 판매일 그대로 복사"에 쓸 직전 판매일 */
export async function previousSaleDate(saleDate: string): Promise<string | null> {
  const rows = await sql`
    select sale_date from daily_items
    where sale_date < ${saleDate}
    order by sale_date desc
    limit 1
  `
  return rows.length ? toDateString(rows[0].sale_date) : null
}

export async function listSaleDates(limit = 30): Promise<string[]> {
  const rows = await sql`
    select distinct sale_date from daily_items order by sale_date desc limit ${limit}
  `
  return (rows as any[]).map((r) => toDateString(r.sale_date))
}

/* ---------- 고객 ---------- */

export async function findCustomer(nickname: string, last4: string): Promise<Customer | null> {
  const rows = await sql`
    select * from customers where nickname = ${nickname} and phone_last4 = ${last4} limit 1
  `
  return (rows[0] as Customer) ?? null
}

export async function findOrCreateCustomer(nickname: string, last4: string): Promise<Customer> {
  const rows = await sql`
    insert into customers (nickname, phone_last4)
    values (${nickname}, ${last4})
    on conflict (nickname, phone_last4) do update set nickname = excluded.nickname
    returning *
  `
  return rows[0] as Customer
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const rows = await sql`select * from customers where id = ${id} limit 1`
  return (rows[0] as Customer) ?? null
}

/**
 * 첫 화면 고객 명단.
 * 닉네임만 보여준다. 단 같은 닉네임이 둘 이상이면 서로 구분할 수 없으므로,
 * 그 경우에만 뒷 4자리를 함께 표시한다 (닉네임+뒷4자리 조합은 유일함이 보장됨).
 */
export async function listCustomerDirectory(): Promise<DirectoryEntry[]> {
  const rows = await sql`
    select c.id,
           c.nickname,
           c.phone_last4,
           (c.pin_hash is not null) as has_pin,
           max(o.id) as last_order_id
      from customers c
      left join orders o on o.customer_id = c.id
     group by c.id
     order by last_order_id desc nulls last, c.nickname
  `

  const seen = new Map<string, number>()
  for (const r of rows as any[]) {
    seen.set(r.nickname, (seen.get(r.nickname) ?? 0) + 1)
  }

  return (rows as any[]).map((r) => ({
    id: r.id,
    nickname: r.nickname,
    hint: (seen.get(r.nickname) ?? 0) > 1 ? String(r.phone_last4) : '',
    has_pin: r.has_pin,
  }))
}

export async function listCustomers(q?: string) {
  const like = q ? `%${q.trim()}%` : null
  const rows = await sql`
    select c.*,
           (c.pin_hash is not null) as has_pin,
           count(o.id) filter (where o.status = 'confirmed')::int as order_count,
           coalesce(sum(o.total_amount) filter (where o.status = 'confirmed'), 0)::int as total_spent,
           coalesce(sum(o.total_amount) filter (where o.status = 'confirmed' and o.is_paid = false), 0)::int as unpaid_amount,
           max(o.sale_date) filter (where o.status = 'confirmed') as last_order_date
    from customers c
    left join orders o on o.customer_id = c.id
    where ${like}::text is null or c.nickname ilike ${like} or c.phone_last4 like ${like}
    group by c.id
    order by last_order_date desc nulls last, c.nickname
  `
  return (rows as any[]).map((r) => ({
    ...r,
    last_order_date: r.last_order_date ? toDateString(r.last_order_date) : null,
  }))
}

/* ---------- 주문 ---------- */

const ORDER_SELECT = `
  select o.*, c.nickname, c.phone_last4
  from orders o
  join customers c on c.id = o.customer_id
`

function mapOrder(r: any): Order {
  return { ...r, sale_date: toDateString(r.sale_date) }
}

export async function listOrders(opts: {
  saleDate?: string
  customerId?: number
  unpaidOnly?: boolean
  limit?: number
}): Promise<Order[]> {
  const { saleDate = null, customerId = null, unpaidOnly = false, limit = 200 } = opts
  const rows = await sql`
    select o.*, c.nickname, c.phone_last4
    from orders o
    join customers c on c.id = o.customer_id
    where (${saleDate}::date is null or o.sale_date = ${saleDate}::date)
      and (${customerId}::int is null or o.customer_id = ${customerId}::int)
      and (${unpaidOnly} = false or (o.is_paid = false and o.status = 'confirmed'))
    order by o.id desc
    limit ${limit}
  `
  return (rows as any[]).map(mapOrder)
}

export async function listOrdersWithItems(opts: Parameters<typeof listOrders>[0]): Promise<Order[]> {
  const orders = await listOrders(opts)
  if (!orders.length) return orders
  const ids = orders.map((o) => o.id)
  const items = (await sql`
    select * from order_items where order_id = any(${ids}::int[]) order by id
  `) as any[]
  const byOrder = new Map<number, OrderItem[]>()
  for (const it of items) {
    if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, [])
    byOrder.get(it.order_id)!.push(it)
  }
  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }))
}

export async function getOrder(id: number): Promise<Order | null> {
  const rows = await sql`
    select o.*, c.nickname, c.phone_last4
    from orders o join customers c on c.id = o.customer_id
    where o.id = ${id} limit 1
  `
  if (!rows.length) return null
  const items = (await sql`select * from order_items where order_id = ${id} order by id`) as OrderItem[]
  return { ...mapOrder(rows[0]), items }
}

/* ---------- 대시보드 요약 ---------- */

export async function dailySummary(saleDate: string) {
  const rows = await sql`
    select count(*)::int as order_count,
           coalesce(sum(total_amount), 0)::int as revenue,
           coalesce(sum(total_amount) filter (where is_paid = false), 0)::int as unpaid,
           count(*) filter (where fulfillment = 'delivery')::int as delivery_count
    from orders
    where sale_date = ${saleDate} and status = 'confirmed'
  `
  return rows[0] as {
    order_count: number
    revenue: number
    unpaid: number
    delivery_count: number
  }
}

/** 오늘 팔린 품목별 합계 — 주인이 준비할 물량 확인용 */
export async function pickList(saleDate: string) {
  const rows = await sql`
    select oi.product_name, oi.unit, sum(oi.qty)::int as qty, sum(oi.amount)::int as amount
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.sale_date = ${saleDate} and o.status = 'confirmed'
    group by oi.product_name, oi.unit
    order by qty desc, oi.product_name
  `
  return rows as { product_name: string; unit: string; qty: number; amount: number }[]
}

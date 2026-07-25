'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  checkAdminPassword,
  endAdminSession,
  requireAdmin,
  startAdminSession,
} from '@/lib/auth'
import { sql } from '@/lib/db'
import { saveOrder } from '@/lib/orders'
import { findOrCreateCustomer } from '@/lib/queries'
import { normalizeLast4, normalizeNickname, todayKST } from '@/lib/util'
import type { CartLine } from '@/lib/types'

export type FormState = { error?: string }

function refresh() {
  revalidatePath('/admin', 'layout')
  revalidatePath('/order')
  revalidatePath('/')
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').replace(/[^\d-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function optionalNum(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number(s.replace(/[^\d]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/* ================= 로그인 ================= */

export async function adminLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get('password') ?? '')
  if (!process.env.ADMIN_PASSWORD) {
    return { error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.' }
  }
  if (!checkAdminPassword(password)) {
    return { error: '비밀번호가 맞지 않습니다.' }
  }
  await startAdminSession()
  redirect('/admin')
}

export async function adminLogout() {
  await endAdminSession()
  redirect('/admin/login')
}

/* ================= 품목 마스터 ================= */

export async function createProduct(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const unit = String(formData.get('unit') ?? '개').trim() || '개'
  const price = num(formData.get('default_price'))
  const category = String(formData.get('category') ?? '').trim() || null

  await sql`
    insert into products (name, unit, default_price, category)
    values (${name}, ${unit}, ${price}, ${category})
    on conflict (name) do update
      set unit = excluded.unit,
          default_price = excluded.default_price,
          category = excluded.category,
          is_archived = false
  `
  refresh()
}

export async function updateProduct(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  const name = String(formData.get('name') ?? '').trim()
  if (!id || !name) return

  await sql`
    update products
       set name = ${name},
           unit = ${String(formData.get('unit') ?? '개').trim() || '개'},
           default_price = ${num(formData.get('default_price'))},
           category = ${String(formData.get('category') ?? '').trim() || null}
     where id = ${id}
  `
  refresh()
}

/** 안 쓰는 품목 숨기기 / 다시 꺼내기 */
export async function toggleArchiveProduct(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`update products set is_archived = not is_archived where id = ${id}`
  refresh()
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  // 주문 이력에 남은 품목은 지우지 않고 숨김 처리한다 (기록 보존)
  const used = await sql`select 1 from order_items where product_id = ${id} limit 1`
  if (used.length) {
    await sql`update products set is_archived = true where id = ${id}`
  } else {
    await sql`delete from products where id = ${id}`
  }
  refresh()
}

/* ================= 판매일별 목록 ================= */

/** 마스터에서 골라 오늘 목록에 넣기 (체크박스 다중 선택) */
export async function addProductsToDate(formData: FormData) {
  await requireAdmin()
  const saleDate = String(formData.get('sale_date') ?? todayKST()).slice(0, 10)
  const ids = formData.getAll('product_ids').map((v) => num(v)).filter(Boolean)
  if (!ids.length) return

  await sql`
    insert into daily_items (sale_date, product_id, price, sort_order)
    select ${saleDate}::date, p.id, p.default_price,
           coalesce((select max(sort_order) from daily_items where sale_date = ${saleDate}::date), 0)
             + row_number() over (order by p.name)
      from products p
     where p.id = any(${ids}::int[])
    on conflict (sale_date, product_id) do nothing
  `
  refresh()
}

/** 새 품목을 마스터에 등록하면서 그날 목록에도 바로 올리기 */
export async function quickAddItem(formData: FormData) {
  await requireAdmin()
  const saleDate = String(formData.get('sale_date') ?? todayKST()).slice(0, 10)
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const unit = String(formData.get('unit') ?? '개').trim() || '개'
  const price = num(formData.get('price'))
  const limitQty = optionalNum(formData.get('limit_qty'))
  const category = String(formData.get('category') ?? '').trim() || null

  const rows = await sql`
    insert into products (name, unit, default_price, category)
    values (${name}, ${unit}, ${price}, ${category})
    on conflict (name) do update
      set unit = excluded.unit, default_price = excluded.default_price, is_archived = false
    returning id
  `
  const productId = rows[0].id

  await sql`
    insert into daily_items (sale_date, product_id, price, limit_qty, sort_order)
    values (${saleDate}::date, ${productId}, ${price}, ${limitQty},
            coalesce((select max(sort_order) + 1 from daily_items where sale_date = ${saleDate}::date), 0))
    on conflict (sale_date, product_id) do update
      set price = excluded.price, limit_qty = excluded.limit_qty, is_active = true
  `
  refresh()
}

export async function updateDailyItem(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`
    update daily_items
       set price = ${num(formData.get('price'))},
           limit_qty = ${optionalNum(formData.get('limit_qty'))},
           sort_order = ${num(formData.get('sort_order'))}
     where id = ${id}
  `
  refresh()
}

export async function toggleDailyItem(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`update daily_items set is_active = not is_active where id = ${id}`
  refresh()
}

export async function removeDailyItem(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  const used = await sql`select 1 from order_items where daily_item_id = ${id} limit 1`
  if (used.length) {
    // 이미 주문이 들어온 품목은 내리기만 한다
    await sql`update daily_items set is_active = false where id = ${id}`
  } else {
    await sql`delete from daily_items where id = ${id}`
  }
  refresh()
}

/** 지난 판매일 목록을 통째로 복사 — 매일 새로 짜지 않아도 되게 */
export async function copyDailyItems(formData: FormData) {
  await requireAdmin()
  const from = String(formData.get('from_date') ?? '').slice(0, 10)
  const to = String(formData.get('to_date') ?? todayKST()).slice(0, 10)
  if (!from || from === to) return

  await sql`
    insert into daily_items (sale_date, product_id, price, limit_qty, sort_order, is_active)
    select ${to}::date, product_id, price, limit_qty, sort_order, true
      from daily_items
     where sale_date = ${from}::date
    on conflict (sale_date, product_id) do nothing
  `
  refresh()
}

/* ================= 주문 ================= */

export async function togglePaid(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`update orders set is_paid = not is_paid where id = ${id}`
  refresh()
}

export async function setOrderStatus(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  const status = String(formData.get('status') ?? '')
  if (!id || !['confirmed', 'cancelled'].includes(status)) return
  await sql`update orders set status = ${status} where id = ${id}`
  refresh()
}

export async function deleteOrder(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`delete from orders where id = ${id}`
  refresh()
}

/** 주인이 대신 주문을 넣거나 수정 */
export async function adminSaveOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()

  const orderId = num(formData.get('order_id')) || undefined
  const saleDate = String(formData.get('sale_date') ?? todayKST()).slice(0, 10)

  let customerId = num(formData.get('customer_id'))
  if (!customerId) {
    const nickname = normalizeNickname(String(formData.get('nickname') ?? ''))
    const last4 = normalizeLast4(String(formData.get('phone_last4') ?? ''))
    if (!nickname) return { error: '고객 닉네임을 입력해주세요.' }
    if (last4.length !== 4) return { error: '휴대폰 뒷 4자리를 입력해주세요.' }
    const customer = await findOrCreateCustomer(nickname, last4)
    customerId = customer.id
  }

  let lines: CartLine[] = []
  try {
    const parsed = JSON.parse(String(formData.get('lines') ?? '[]'))
    lines = (Array.isArray(parsed) ? parsed : [])
      .map((l: any) => ({ dailyItemId: Number(l?.dailyItemId), qty: Number(l?.qty) }))
      .filter((l) => Number.isInteger(l.dailyItemId) && Number.isInteger(l.qty) && l.qty > 0)
  } catch {
    return { error: '주문 내용을 읽지 못했습니다.' }
  }

  const fulfillment = formData.get('fulfillment') === 'delivery' ? 'delivery' : 'pickup'
  const address = String(formData.get('address') ?? '').trim()
  if (fulfillment === 'delivery' && !address) return { error: '배달 주소를 입력해주세요.' }

  const result = await saveOrder({
    orderId,
    customerId,
    saleDate,
    lines,
    fulfillment,
    pickupTime: fulfillment === 'pickup' ? String(formData.get('pickup_time') ?? '').trim() : null,
    address: fulfillment === 'delivery' ? address : null,
    memo: String(formData.get('memo') ?? '').trim(),
    source: 'admin',
  })

  if (!result.ok) return { error: result.error }

  if (fulfillment === 'delivery') {
    await sql`update customers set address = ${address} where id = ${customerId}`
  }
  if (formData.get('mark_paid') === 'on') {
    await sql`update orders set is_paid = true where id = ${result.orderId}`
  }

  refresh()
  redirect(`/admin/orders?date=${saleDate}&saved=${result.orderId}`)
}

/* ================= 고객 ================= */

export async function updateCustomer(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  const nickname = normalizeNickname(String(formData.get('nickname') ?? ''))
  const last4 = normalizeLast4(String(formData.get('phone_last4') ?? ''))
  if (!id || !nickname || last4.length !== 4) return

  await sql`
    update customers
       set nickname = ${nickname},
           phone_last4 = ${last4},
           address = ${String(formData.get('address') ?? '').trim() || null},
           memo = ${String(formData.get('memo') ?? '').trim() || null}
     where id = ${id}
  `
  refresh()
}

export async function createCustomer(formData: FormData) {
  await requireAdmin()
  const nickname = normalizeNickname(String(formData.get('nickname') ?? ''))
  const last4 = normalizeLast4(String(formData.get('phone_last4') ?? ''))
  if (!nickname || last4.length !== 4) return

  const customer = await findOrCreateCustomer(nickname, last4)
  const address = String(formData.get('address') ?? '').trim()
  const memo = String(formData.get('memo') ?? '').trim()
  if (address || memo) {
    await sql`
      update customers
         set address = coalesce(nullif(${address}, ''), address),
             memo = coalesce(nullif(${memo}, ''), memo)
       where id = ${customer.id}
    `
  }
  refresh()
}

/** 고객이 비밀번호를 잊었을 때 — 지우면 다음 접속에서 본인이 새로 정한다 */
export async function resetCustomerPin(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`
    update customers
       set pin_hash = null, pin_fail_count = 0, pin_locked_until = null
     where id = ${id}
  `
  refresh()
}

export async function deleteCustomer(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  const used = await sql`select 1 from orders where customer_id = ${id} limit 1`
  if (used.length) return // 주문 기록이 있는 고객은 삭제하지 않음
  await sql`delete from customers where id = ${id}`
  refresh()
}

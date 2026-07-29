'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  checkAdminPassword,
  endAdminSession,
  requireAdmin,
  startAdminSession,
} from '@/lib/auth'
import { parseCsv } from '@/lib/csv'
import { sql } from '@/lib/db'
import { downloadImage } from '@/lib/imageSearch'
import { saveOrder } from '@/lib/orders'
import { nicknameTaken, resolveCustomer } from '@/lib/queries'
import { normalizeLast4, normalizeNickname, todayKST } from '@/lib/util'
import type { CartLine } from '@/lib/types'

export type FormState = { error?: string; message?: string }

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
  const price = num(formData.get('default_price'))
  const category = String(formData.get('category') ?? '').trim() || null

  // 단위는 더 이상 고르지 않는다 — 전부 '개'로 통일
  await sql`
    insert into products (name, unit, default_price, category)
    values (${name}, '개', ${price}, ${category})
    on conflict (name) do update
      set default_price = excluded.default_price,
          category = excluded.category,
          is_archived = false
  `
  refresh()
}

/** 품목함 상단 '저장' — 화면에 보이는 모든 품목의 이름·가격·분류를 한 번에 저장한다. */
export async function bulkUpdateProducts(
  entries: { id: number; name: string; price: string; category: string }[],
) {
  await requireAdmin()
  await Promise.all(
    entries
      .filter((e) => e.name.trim())
      .map((e) => {
        const price = Number(e.price.replace(/[^\d]/g, '')) || 0
        return sql`
          update products
             set name = ${e.name.trim()},
                 default_price = ${price},
                 category = ${e.category.trim() || null}
           where id = ${e.id}
        `
      }),
  )
  refresh()
}

/** 엑셀(CSV)로 내려받은 품목함 파일을 다시 올리면 품목명 기준으로 일괄 추가·수정한다. */
export async function importProducts(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: '파일을 선택해주세요.' }
  }

  const rows = parseCsv(await file.text())
  const dataRows = rows[0]?.[0]?.trim() === '품목명' ? rows.slice(1) : rows
  if (!dataRows.length) {
    return { error: '읽을 수 있는 품목이 없습니다.' }
  }

  let added = 0
  let updatedCount = 0
  for (const row of dataRows) {
    const name = (row[0] ?? '').trim()
    if (!name) continue
    const price = num(row[1])
    const category = (row[2] ?? '').trim() || null
    const archived = (row[3] ?? '').trim() === '보관됨'

    const existing = await sql`select 1 from products where name = ${name}`
    if (existing.length) updatedCount++
    else added++

    await sql`
      insert into products (name, unit, default_price, category, is_archived)
      values (${name}, '개', ${price}, ${category}, ${archived})
      on conflict (name) do update
        set default_price = excluded.default_price,
            category = excluded.category,
            is_archived = excluded.is_archived
    `
  }

  refresh()
  return { message: `${added}개 추가, ${updatedCount}개 수정됐습니다.` }
}

/** 안 쓰는 품목 숨기기 / 다시 꺼내기 */
export async function toggleArchiveProduct(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`update products set is_archived = not is_archived where id = ${id}`
  refresh()
}

/** 품목함 상단 '보관함으로' — 체크한 품목들을 한 번에 보관함으로 옮긴다. */
export async function bulkArchiveProducts(ids: number[]) {
  await requireAdmin()
  await Promise.all(ids.map((id) => sql`update products set is_archived = true where id = ${id}`))
  refresh()
}

/** 품목함 상단 '삭제' — 체크한 품목들을 한 번에 지운다. 주문 이력이 있으면 보관 처리만 한다. */
export async function bulkDeleteProducts(ids: number[]) {
  await requireAdmin()
  await Promise.all(
    ids.map(async (id) => {
      // 주문 이력에 남은 품목은 지우지 않고 보관 처리한다 (기록 보존)
      const used = await sql`select 1 from order_items where product_id = ${id} limit 1`
      if (used.length) {
        await sql`update products set is_archived = true where id = ${id}`
      } else {
        await sql`delete from products where id = ${id}`
      }
    }),
  )
  refresh()
}

/** 품목 사진 저장. 브라우저에서 정사각형으로 잘라 줄인 JPEG 을 base64 로 받는다. */
export async function updateProductImage(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = num(formData.get('product_id'))
  const dataUrl = String(formData.get('image') ?? '')
  if (!id) return { error: '품목을 찾지 못했습니다.' }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl)
  if (!match) return { error: '사진을 읽지 못했습니다. 다시 선택해주세요.' }

  const base64 = match[2]
  if (Buffer.byteLength(base64, 'base64') > 2_000_000) {
    return { error: '사진 용량이 너무 큽니다. 다시 시도해주세요.' }
  }

  // Buffer 를 그대로 넘기면 드라이버마다 처리가 달라, base64 문자열을 DB에서 디코드한다
  await sql`
    update products
       set image_data = decode(${base64}, 'base64'),
           image_type = ${match[1]},
           image_version = image_version + 1
     where id = ${id}
  `
  refresh()
  return {}
}

export async function deleteProductImage(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`
    update products
       set image_data = null, image_type = null, image_version = image_version + 1
     where id = ${id}
  `
  refresh()
}

/**
 * 무료 이미지 검색(Openverse) 결과 중 하나를 품목 사진으로 등록한다.
 * 브라우저가 아니라 서버가 직접 원본을 받아오므로 CORS 문제가 없고,
 * 자르기/축소 없이 원본 그대로 저장한다 (화면에서는 정사각 컨테이너에 object-cover 로 채워진다).
 */
export async function attachImageFromUrl(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = num(formData.get('product_id'))
  const imageUrl = String(formData.get('image_url') ?? '')
  if (!id || !imageUrl) return { error: '품목을 찾지 못했습니다.' }

  try {
    const { base64, contentType } = await downloadImage(imageUrl)
    await sql`
      update products
         set image_data = decode(${base64}, 'base64'),
             image_type = ${contentType},
             image_version = image_version + 1
       where id = ${id}
    `
    refresh()
    return {}
  } catch (err) {
    console.error('attachImageFromUrl failed', err)
    return { error: err instanceof Error ? err.message : '이미지를 등록하지 못했습니다.' }
  }
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

  const price = num(formData.get('price'))
  const limitQty = optionalNum(formData.get('limit_qty'))
  const category = String(formData.get('category') ?? '').trim() || null

  // 새 품목은 언제나 품목함(products)에 먼저 등록되고, 그날 판매목록에도 함께 올라간다
  const rows = await sql`
    insert into products (name, unit, default_price, category)
    values (${name}, '개', ${price}, ${category})
    on conflict (name) do update
      set default_price = excluded.default_price,
          category = coalesce(excluded.category, products.category),
          is_archived = false
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

const HIGHLIGHT_KEYS = ['timesale', 'limited', 'best']

/** 'HH:MM' 형식만 통과 */
function timeOfDay(v: FormDataEntryValue | null): string {
  const s = String(v ?? '').trim()
  return /^\d{2}:\d{2}$/.test(s) ? s : ''
}

/** 판매목록 화면 상단의 '저장' 버튼 — 목록에 보이는 모든 품목의 정가·수량제한을 한 번에 저장한다. */
export async function bulkUpdateDailyItems(formData: FormData) {
  await requireAdmin()
  const ids = formData.getAll('ids').map((v) => num(v)).filter(Boolean)

  await Promise.all(
    ids.map((id) =>
      sql`
        update daily_items
           set price = ${num(formData.get(`price_${id}`))},
               limit_qty = ${optionalNum(formData.get(`limit_qty_${id}`))}
         where id = ${id}
      `,
    ),
  )
  refresh()
}

/**
 * 여러 품목을 한 번에 골라 세일가·세일 시간대·노출 구역을 적용한다.
 * 상단 툴바에서 체크박스로 고른 daily_item id 들이 daily_item_ids 로 넘어온다.
 */
export async function bulkSetSale(formData: FormData) {
  await requireAdmin()
  const ids = formData.getAll('daily_item_ids').map((v) => num(v)).filter(Boolean)
  if (!ids.length) return

  const highlight = String(formData.get('highlight') ?? '')
  const salePrice = optionalNum(formData.get('sale_price'))
  const from = timeOfDay(formData.get('sale_from'))
  // 몇 시간 동안 할지 — 시작 시간이 있을 때만 의미가 있다. 비우면 시작 후 계속 진행(끝 시각 없음).
  const hours = from === '' ? null : optionalNum(formData.get('sale_hours'))

  // 세일 시각은 각 품목의 판매 날짜 기준 한국 시간으로 해석해 timestamptz 로 저장하고,
  // 종료 시각은 시작 시각 + N시간으로 계산한다 (종료 시각을 직접 받지 않는다).
  await sql`
    update daily_items
       set sale_price = ${salePrice},
           sale_starts_at = case
             when ${from} = '' then null
             else (sale_date::text || ' ' || ${from})::timestamp at time zone 'Asia/Seoul'
           end,
           sale_ends_at = case
             when ${from} = '' or ${hours}::numeric is null then null
             else (sale_date::text || ' ' || ${from})::timestamp at time zone 'Asia/Seoul'
                    + (${hours}::numeric || ' hours')::interval
           end,
           highlight = ${HIGHLIGHT_KEYS.includes(highlight) ? highlight : null}
     where id = any(${ids}::int[])
  `
  refresh()
}

/** 선택한 품목의 세일·노출 설정을 한 번에 지운다 (정가로 되돌림). */
export async function bulkClearSale(formData: FormData) {
  await requireAdmin()
  const ids = formData.getAll('daily_item_ids').map((v) => num(v)).filter(Boolean)
  if (!ids.length) return

  await sql`
    update daily_items
       set sale_price = null, sale_starts_at = null, sale_ends_at = null, highlight = null
     where id = any(${ids}::int[])
  `
  refresh()
}

/**
 * '마감' 은 실제 재고 부족이 아니라 오늘 확정된 주문이 수량 제한(limit_qty)에 도달했다는 뜻이다.
 * 그래서 관리자가 끄고 켜는 스위치가 아니라, 제한을 풀어야 없어진다.
 * 이 액션은 그 제한을 통째로 없애 '무제한'으로 바꾼다 — 마감 배지 옆의 '무제한으로 풀기' 버튼용.
 */
export async function clearDailyItemLimit(id: number) {
  await requireAdmin()
  if (!id) return
  await sql`update daily_items set limit_qty = null where id = ${id}`
  refresh()
}

/** 상단 '숨김' 버튼 — 체크한 품목들의 고객 화면 노출 여부를 한 번에 뒤집는다. */
export async function bulkToggleDailyItems(ids: number[]) {
  await requireAdmin()
  await Promise.all(
    ids.map((id) => sql`update daily_items set is_active = not is_active where id = ${id}`),
  )
  refresh()
}

/** 상단 '품목함으로!' 버튼 — 체크한 품목들을 오늘 목록에서 한 번에 내린다. */
export async function bulkRemoveDailyItems(ids: number[]) {
  await requireAdmin()
  // 주문 상세(order_items)는 품목명·단가를 주문 시점 값으로 따로 저장해두므로,
  // 이미 주문이 들어온 품목이라도 오늘 목록에서 지우는 건 주문 기록에 영향이 없다.
  await Promise.all(ids.map((id) => sql`delete from daily_items where id = ${id}`))
  refresh()
}

/** 판매목록 화면에서 드래그로 바꾼 순서를 그대로 저장한다 */
export async function reorderDailyItems(ids: number[]) {
  await requireAdmin()
  await Promise.all(ids.map((id, index) => sql`update daily_items set sort_order = ${index} where id = ${id}`))
  refresh()
}

/** 지난 판매일 목록을 통째로 복사 — 매일 새로 짜지 않아도 되게 */
export async function copyDailyItems(formData: FormData) {
  await requireAdmin()
  const from = String(formData.get('from_date') ?? '').slice(0, 10)
  const to = String(formData.get('to_date') ?? todayKST()).slice(0, 10)
  if (!from || from === to) return

  const inserted = await sql`
    insert into daily_items (sale_date, product_id, price, limit_qty, sort_order, is_active)
    select ${to}::date, product_id, price, limit_qty, sort_order, true
      from daily_items
     where sale_date = ${from}::date
    on conflict (sale_date, product_id) do nothing
    returning id
  `
  refresh()
  redirect(`/admin/today?date=${to}&copied_from=${from}&copied_count=${inserted.length}`)
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
    const resolved = await resolveCustomer(nickname, last4)
    if (!resolved.ok) return { error: resolved.error }
    customerId = resolved.customer.id
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

  if (await nicknameTaken(nickname, id)) {
    redirect(`/admin/customers?dup=${encodeURIComponent(nickname)}`)
  }

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

  const resolved = await resolveCustomer(nickname, last4)
  if (!resolved.ok) {
    redirect(`/admin/customers?dup=${encodeURIComponent(nickname)}`)
  }

  const address = String(formData.get('address') ?? '').trim()
  const memo = String(formData.get('memo') ?? '').trim()
  if (address || memo) {
    await sql`
      update customers
         set address = coalesce(nullif(${address}, ''), address),
             memo = coalesce(nullif(${memo}, ''), memo)
       where id = ${resolved.customer.id}
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

/* ================= 실시간 주문 알림 (가짜 항목) ================= */

export async function addFakeFeedItem(formData: FormData) {
  await requireAdmin()
  const nickname = normalizeNickname(String(formData.get('nickname') ?? ''))
  const productName = String(formData.get('product_name') ?? '').trim()
  const qty = Math.max(1, num(formData.get('qty')) || 1)
  if (!nickname || !productName) return

  await sql`
    insert into feed_fakes (nickname, product_name, qty)
    values (${nickname}, ${productName}, ${qty})
  `
  refresh()
}

export async function toggleFakeFeedItem(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`update feed_fakes set is_active = not is_active where id = ${id}`
  refresh()
}

export async function deleteFakeFeedItem(formData: FormData) {
  await requireAdmin()
  const id = num(formData.get('id'))
  if (!id) return
  await sql`delete from feed_fakes where id = ${id}`
  refresh()
}

/* ================= 가게 설정 ================= */

/** 주문 마감 시각을 설정한다. 비워서 저장하면 마감 없이 하루 종일 주문을 받는다. */
export async function updateOrderCutoff(formData: FormData) {
  await requireAdmin()
  const time = timeOfDay(formData.get('order_cutoff_time'))
  await sql`
    update shop_settings set order_cutoff_time = ${time || null}, updated_at = now() where id = 1
  `
  refresh()
}

/** 가게 이름·지점·연락처·오픈채팅 링크. 비워서 저장하면 그 항목은 화면에서 사라진다. */
export async function updateShopInfo(formData: FormData) {
  await requireAdmin()
  const shopName = String(formData.get('shop_name') ?? '').trim()
  const shopBranch = String(formData.get('shop_branch') ?? '').trim()
  const shopPhone = String(formData.get('shop_phone') ?? '').trim()
  const openChatUrl = String(formData.get('openchat_url') ?? '').trim()

  await sql`
    update shop_settings
       set shop_name = ${shopName || null},
           shop_branch = ${shopBranch || null},
           shop_phone = ${shopPhone || null},
           shop_openchat_url = ${openChatUrl || null},
           updated_at = now()
     where id = 1
  `
  refresh()
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import {
  endCustomerSession,
  getCustomerId,
  hashPin,
  startCustomerSession,
  verifyPinHash,
} from '@/lib/auth'
import { sql } from '@/lib/db'
import { getCustomer, getOrder, getOrderCutoffTime } from '@/lib/queries'
import { saveOrder } from '@/lib/orders'
import { formatOrderMessage, notifyOwner } from '@/lib/telegram'
import { nowTimeKST, todayKST } from '@/lib/util'
import type { CartLine } from '@/lib/types'

/**
 * 방금 저장된 주문을 사장님에게 텔레그램으로 알린다.
 * revalidatePath/redirect 를 지연시키지 않도록 응답을 보낸 뒤(after) 실행하고,
 * 실패해도 주문 자체에는 영향을 주지 않는다.
 */
function notifyOrderSaved(orderId: number, customerId: number, title: string) {
  after(async () => {
    const [customer, order] = await Promise.all([getCustomer(customerId), getOrder(orderId)])
    if (!customer || !order) return
    await notifyOwner(
      formatOrderMessage({
        title,
        nickname: customer.nickname,
        lines: (order.items ?? []).map((i) => ({ name: i.product_name, qty: i.qty })),
        total: order.total_amount,
        fulfillment: order.fulfillment,
        pickupTime: order.pickup_time,
        address: order.address,
        memo: order.memo,
      }),
    )
  })
}

/** 마감 시각이 지났으면 안내 메시지를, 아니면 null 을 돌려준다. */
async function checkOrderCutoff(): Promise<string | null> {
  const cutoff = await getOrderCutoffTime()
  if (!cutoff || nowTimeKST() < cutoff) return null
  return `오늘 주문은 ${cutoff}에 마감됐습니다. 내일 다시 이용해주세요.`
}

export type FormState = { error?: string }

const MAX_FAILS = 5
const LOCK_MINUTES = 5

function readPin(formData: FormData, field = 'pin'): string {
  return String(formData.get(field) ?? '').replace(/\D/g, '').slice(0, 4)
}

function lockMessage(until: Date): string {
  const mins = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000))
  return `비밀번호를 여러 번 틀렸습니다. ${mins}분 뒤에 다시 시도해주세요.`
}

/** 명단에서 고른 고객이 처음이라 비밀번호가 없을 때, 본인이 직접 정한다 */
export async function createPin(_prev: FormState, formData: FormData): Promise<FormState> {
  const customerId = Number(formData.get('customer_id'))
  const pin = readPin(formData)
  const confirm = readPin(formData, 'pin_confirm')

  if (!Number.isInteger(customerId)) return { error: '고객 정보를 찾지 못했습니다.' }
  if (pin.length !== 4) return { error: '숫자 4자리로 정해주세요.' }
  if (pin !== confirm) return { error: '두 번 입력한 번호가 다릅니다. 다시 해주세요.' }

  // pin_hash 가 비어 있을 때만 설정된다 — 이미 정한 사람의 비번을 남이 덮어쓸 수 없다
  const rows = await sql`
    update customers
       set pin_hash = ${hashPin(customerId, pin)}, pin_fail_count = 0, pin_locked_until = null
     where id = ${customerId} and pin_hash is null
    returning id
  `
  if (!rows.length) return { error: '이미 비밀번호가 등록된 분입니다. 번호를 입력해주세요.' }

  await startCustomerSession(customerId)
  redirect('/order')
}

/** 명단에서 고른 고객이 4자리 비밀번호로 입장 */
export async function enterWithPin(_prev: FormState, formData: FormData): Promise<FormState> {
  const customerId = Number(formData.get('customer_id'))
  const pin = readPin(formData)

  if (!Number.isInteger(customerId)) return { error: '고객 정보를 찾지 못했습니다.' }
  if (pin.length !== 4) return { error: '숫자 4자리를 입력해주세요.' }

  const customer = await getCustomer(customerId)
  if (!customer) return { error: '고객 정보를 찾지 못했습니다.' }

  const lockedUntil = customer.pin_locked_until ? new Date(customer.pin_locked_until) : null
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    return { error: lockMessage(lockedUntil) }
  }

  if (!verifyPinHash(customerId, pin, customer.pin_hash ?? null)) {
    const rows = await sql`
      update customers
         set pin_fail_count = pin_fail_count + 1,
             pin_locked_until = case
               when pin_fail_count + 1 >= ${MAX_FAILS}
                 then now() + (${LOCK_MINUTES} || ' minutes')::interval
               else null
             end
       where id = ${customerId}
      returning pin_fail_count, pin_locked_until
    `
    const left = MAX_FAILS - Number(rows[0]?.pin_fail_count ?? 0)
    if (left <= 0 && rows[0]?.pin_locked_until) {
      return { error: lockMessage(new Date(rows[0].pin_locked_until)) }
    }
    return { error: `비밀번호가 맞지 않습니다. (${left}번 더 틀리면 잠깁니다)` }
  }

  await sql`
    update customers set pin_fail_count = 0, pin_locked_until = null where id = ${customerId}
  `
  await startCustomerSession(customerId)
  redirect('/order')
}

export async function leaveShop() {
  await endCustomerSession()
  redirect('/')
}

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const customerId = await getCustomerId()
  if (!customerId) redirect('/')

  const cutoffMessage = await checkOrderCutoff()
  if (cutoffMessage) return { error: cutoffMessage }

  let lines: CartLine[] = []
  try {
    const parsed = JSON.parse(String(formData.get('lines') ?? '[]'))
    if (!Array.isArray(parsed)) throw new Error('bad shape')
    lines = parsed
      .map((l: any) => ({ dailyItemId: Number(l?.dailyItemId), qty: Number(l?.qty) }))
      .filter((l) => Number.isInteger(l.dailyItemId) && Number.isInteger(l.qty) && l.qty > 0)
  } catch {
    return { error: '주문 내용을 읽지 못했습니다. 새로고침 후 다시 시도해주세요.' }
  }

  const fulfillment = formData.get('fulfillment') === 'delivery' ? 'delivery' : 'pickup'
  const address = String(formData.get('address') ?? '').trim()

  if (fulfillment === 'delivery' && !address) {
    return { error: '배달 주소를 입력해주세요.' }
  }

  const result = await saveOrder({
    customerId,
    saleDate: todayKST(),
    lines,
    fulfillment,
    pickupTime: fulfillment === 'pickup' ? String(formData.get('pickup_time') ?? '').trim() : null,
    address: fulfillment === 'delivery' ? address : null,
    memo: String(formData.get('memo') ?? '').trim(),
    source: 'customer',
  })

  if (!result.ok) return { error: result.error }

  // 다음 주문 때 주소를 미리 채워주기 위해 기본 주소로 저장
  if (fulfillment === 'delivery') {
    await sql`update customers set address = ${address} where id = ${customerId}`
  }

  notifyOrderSaved(result.orderId, customerId, '🛒 새 주문이 들어왔어요')

  revalidatePath('/order')
  redirect('/order?done=1')
}

/** 고객 본인이 오늘 주문을 수정 (취소와 같은 조건 — 당일 · 미입금 · 확정 상태일 때만) */
export async function updateMyOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const customerId = await getCustomerId()
  if (!customerId) redirect('/')

  const orderId = Number(formData.get('order_id'))
  if (!Number.isInteger(orderId)) return { error: '주문 정보를 찾지 못했습니다.' }

  const existing = await getOrder(orderId)
  if (!existing || existing.customer_id !== customerId) {
    return { error: '수정할 수 없는 주문입니다.' }
  }
  if (existing.status !== 'confirmed' || existing.is_paid || existing.sale_date !== todayKST()) {
    return { error: '입금 완료됐거나 취소된 주문은 수정할 수 없습니다.' }
  }

  const cutoffMessage = await checkOrderCutoff()
  if (cutoffMessage) return { error: cutoffMessage }

  let lines: CartLine[] = []
  try {
    const parsed = JSON.parse(String(formData.get('lines') ?? '[]'))
    if (!Array.isArray(parsed)) throw new Error('bad shape')
    lines = parsed
      .map((l: any) => ({ dailyItemId: Number(l?.dailyItemId), qty: Number(l?.qty) }))
      .filter((l) => Number.isInteger(l.dailyItemId) && Number.isInteger(l.qty) && l.qty > 0)
  } catch {
    return { error: '주문 내용을 읽지 못했습니다. 새로고침 후 다시 시도해주세요.' }
  }

  const fulfillment = formData.get('fulfillment') === 'delivery' ? 'delivery' : 'pickup'
  const address = String(formData.get('address') ?? '').trim()

  if (fulfillment === 'delivery' && !address) {
    return { error: '배달 주소를 입력해주세요.' }
  }

  const result = await saveOrder({
    orderId,
    customerId,
    saleDate: existing.sale_date,
    lines,
    fulfillment,
    pickupTime: fulfillment === 'pickup' ? String(formData.get('pickup_time') ?? '').trim() : null,
    address: fulfillment === 'delivery' ? address : null,
    memo: String(formData.get('memo') ?? '').trim(),
    source: 'customer',
  })

  if (!result.ok) return { error: result.error }

  if (fulfillment === 'delivery') {
    await sql`update customers set address = ${address} where id = ${customerId}`
  }

  notifyOrderSaved(orderId, customerId, '✏️ 주문이 수정됐어요')

  revalidatePath('/order')
  redirect('/order?edited=1')
}

/** 고객 본인이 오늘 주문을 취소 (입금 완료 처리된 건은 주인만 취소 가능) */
export async function cancelMyOrder(formData: FormData) {
  const customerId = await getCustomerId()
  if (!customerId) redirect('/')

  const orderId = Number(formData.get('order_id'))
  if (!Number.isInteger(orderId)) return

  await sql`
    update orders set status = 'cancelled'
    where id = ${orderId}
      and customer_id = ${customerId}
      and sale_date = ${todayKST()}
      and is_paid = false
      and status = 'confirmed'
  `
  revalidatePath('/order')
}

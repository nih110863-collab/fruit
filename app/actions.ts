'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { endCustomerSession, getCustomerId, startCustomerSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { findOrCreateCustomer } from '@/lib/queries'
import { saveOrder } from '@/lib/orders'
import { normalizeLast4, normalizeNickname, todayKST } from '@/lib/util'
import type { CartLine } from '@/lib/types'

export type FormState = { error?: string }

/** 회원가입 없이 닉네임 + 휴대폰 뒷 4자리로 입장 (없으면 자동 등록) */
export async function enterShop(_prev: FormState, formData: FormData): Promise<FormState> {
  const nickname = normalizeNickname(String(formData.get('nickname') ?? ''))
  const last4 = normalizeLast4(String(formData.get('phone_last4') ?? ''))

  if (nickname.length < 1) return { error: '닉네임(이름)을 입력해주세요.' }
  if (nickname.length > 20) return { error: '닉네임은 20자 이내로 입력해주세요.' }
  if (last4.length !== 4) return { error: '휴대폰 뒷 4자리를 숫자로 입력해주세요.' }

  const customer = await findOrCreateCustomer(nickname, last4)
  await startCustomerSession(customer.id)
  redirect('/order')
}

export async function leaveShop() {
  await endCustomerSession()
  redirect('/')
}

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const customerId = await getCustomerId()
  if (!customerId) redirect('/')

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

  revalidatePath('/order')
  redirect('/order?done=1')
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

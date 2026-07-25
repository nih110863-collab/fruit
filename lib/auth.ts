import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret'
const ADMIN_COOKIE = 'fruit_admin'
const CUSTOMER_COOKIE = 'fruit_customer'
const THIRTY_DAYS = 60 * 60 * 24 * 30

function sign(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('base64url')
}

function pack(value: string): string {
  return `${value}.${sign(value)}`
}

function unpack(token: string | undefined): string | null {
  if (!token) return null
  const idx = token.lastIndexOf('.')
  if (idx < 1) return null
  const value = token.slice(0, idx)
  const given = Buffer.from(token.slice(idx + 1))
  const want = Buffer.from(sign(value))
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null
  return value
}

/* ---------- 관리자(주인) ---------- */

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function startAdminSession() {
  const exp = Date.now() + THIRTY_DAYS * 1000
  const store = await cookies()
  store.set(ADMIN_COOKIE, pack(`admin:${exp}`), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
}

export async function endAdminSession() {
  ;(await cookies()).delete(ADMIN_COOKIE)
}

export async function isAdmin(): Promise<boolean> {
  const value = unpack((await cookies()).get(ADMIN_COOKIE)?.value)
  if (!value?.startsWith('admin:')) return false
  return Number(value.slice(6)) > Date.now()
}

/** 관리자 전용 페이지/액션 진입점에서 호출. 아니면 로그인으로 보냄. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login')
}

/* ---------- 고객 비밀번호(4자리 PIN) ---------- */

/**
 * PIN 원문은 저장하지 않는다. SESSION_SECRET 을 키로 쓴 HMAC 만 보관하므로
 * DB만 유출되어도 PIN 을 되돌릴 수 없다. 고객 id 를 섞어 같은 번호를 써도 해시가 달라진다.
 */
export function hashPin(customerId: number, pin: string): string {
  return createHmac('sha256', SECRET).update(`pin:${customerId}:${pin}`).digest('base64url')
}

export function verifyPinHash(customerId: number, pin: string, stored: string | null): boolean {
  if (!stored) return false
  const a = Buffer.from(hashPin(customerId, pin))
  const b = Buffer.from(stored)
  return a.length === b.length && timingSafeEqual(a, b)
}

/* ---------- 고객 ---------- */

export async function startCustomerSession(customerId: number) {
  const store = await cookies()
  store.set(CUSTOMER_COOKIE, pack(`c:${customerId}`), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
}

export async function endCustomerSession() {
  ;(await cookies()).delete(CUSTOMER_COOKIE)
}

export async function getCustomerId(): Promise<number | null> {
  const value = unpack((await cookies()).get(CUSTOMER_COOKIE)?.value)
  if (!value?.startsWith('c:')) return null
  const id = Number(value.slice(2))
  return Number.isInteger(id) && id > 0 ? id : null
}

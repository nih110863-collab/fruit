export type Product = {
  id: number
  name: string
  unit: string
  default_price: number
  category: string | null
  is_archived: boolean
  has_image: boolean
  image_version: number
}

export type DailyItem = {
  id: number
  product_id: number
  name: string
  unit: string
  category: string | null
  price: number
  limit_qty: number | null
  sort_order: number
  is_active: boolean
  ordered_qty: number
  /** limit_qty 가 null 이면 null (무제한) */
  remaining: number | null
  has_image: boolean
  image_version: number

  /** 세일가 (없으면 null) */
  sale_price: number | null
  /** 'HH:MM' — 세일 시간대. 비어 있으면 하루 종일 */
  sale_from: string | null
  sale_to: string | null
  /** 지금 세일가가 적용되는 중 */
  sale_active: boolean
  /** 세일이 예정되어 있고 아직 시작 전 */
  sale_upcoming: boolean
  /** 지금 실제로 팔리는 가격 (세일 중이면 세일가) */
  effective_price: number
  highlight: Highlight | null
}

export type Highlight = 'timesale' | 'limited' | 'best'

export const HIGHLIGHTS: { key: Highlight; label: string; title: string }[] = [
  { key: 'timesale', label: '타임세일', title: '⏰ 타임세일' },
  { key: 'limited', label: '한정수량세일', title: '🔥 한정수량 세일' },
  { key: 'best', label: '오늘의 베스트', title: '⭐ 오늘의 베스트' },
]

export type Customer = {
  id: number
  nickname: string
  phone_last4: string
  address: string | null
  memo: string | null
  pin_hash?: string | null
  pin_fail_count?: number
  pin_locked_until?: string | null
}

/** 고객 명단 화면에 뿌리는 최소 정보 — 휴대폰 뒷자리는 내보내지 않는다 */
export type DirectoryEntry = {
  id: number
  nickname: string
  has_pin: boolean
}

export type OrderItem = {
  id: number
  daily_item_id: number | null
  product_id: number | null
  product_name: string
  unit: string
  unit_price: number
  qty: number
  amount: number
}

export type Order = {
  id: number
  customer_id: number
  nickname: string
  phone_last4: string
  sale_date: string
  fulfillment: 'pickup' | 'delivery'
  pickup_time: string | null
  address: string | null
  memo: string | null
  total_amount: number
  is_paid: boolean
  status: 'confirmed' | 'cancelled'
  source: 'customer' | 'admin'
  created_at: string
  items?: OrderItem[]
}

export type CartLine = { dailyItemId: number; qty: number }

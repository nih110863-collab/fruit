export type Product = {
  id: number
  name: string
  unit: string
  default_price: number
  category: string | null
  is_archived: boolean
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
}

export type Customer = {
  id: number
  nickname: string
  phone_last4: string
  address: string | null
  memo: string | null
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

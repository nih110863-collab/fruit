'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: '오늘' },
  { href: '/admin/today', label: '판매목록' },
  { href: '/admin/discounts', label: '할인설정' },
  { href: '/admin/orders', label: '주문' },
  { href: '/admin/stats', label: '통계' },
  { href: '/admin/customers', label: '고객' },
  { href: '/admin/settings', label: '가게관리' },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 pb-2">
      {LINKS.map((link) => {
        const active =
          link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              active ? 'bg-brand-600 text-white' : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

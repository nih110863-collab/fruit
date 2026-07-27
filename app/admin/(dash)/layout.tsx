import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { adminLogout } from '../actions'
import NavLinks from './NavLinks'
import { getShopSettings } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  const { shopName, shopBranch } = await getShopSettings()

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="text-base font-bold">
            {shopName}
            {shopBranch && <span className="text-stone-400"> / {shopBranch}</span>}{' '}
            <span className="text-stone-400">관리</span>
          </Link>
          <form action={adminLogout}>
            <button className="btn-ghost btn-sm" type="submit">
              로그아웃
            </button>
          </form>
        </div>
        <NavLinks />
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}

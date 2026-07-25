import Link from 'next/link'
import { redirect } from 'next/navigation'
import EnterForm from './EnterForm'
import { getCustomerId } from '@/lib/auth'
import { listDailyItems } from '@/lib/queries'
import { todayKST, formatDate } from '@/lib/util'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (await getCustomerId()) redirect('/order')

  const today = todayKST()
  const items = await listDailyItems(today, true)
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || '새벽앤과일'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-10">
      <header className="mb-8 text-center">
        <p className="text-sm font-semibold text-brand-600">{formatDate(today)}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{shopName}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {items.length > 0
            ? `오늘 ${items.length}가지 준비했어요`
            : '오늘 판매 목록은 곧 올라옵니다'}
        </p>
      </header>

      <div className="card">
        <EnterForm />
      </div>

      {items.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold text-stone-600">오늘의 품목</h2>
          <ul className="flex flex-wrap gap-2">
            {items.map((it) => (
              <li
                key={it.id}
                className={`badge border ${
                  it.remaining === 0
                    ? 'border-stone-200 bg-stone-100 text-stone-400 line-through'
                    : 'border-brand-100 bg-brand-50 text-brand-700'
                }`}
              >
                {it.name}
                {it.remaining !== null && it.remaining > 0 && (
                  <span className="ml-1 font-normal opacity-70">
                    {it.remaining}
                    {it.unit}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-10 text-center">
        <Link href="/admin" className="text-xs text-stone-400 underline underline-offset-4">
          사장님 관리자
        </Link>
      </footer>
    </main>
  )
}

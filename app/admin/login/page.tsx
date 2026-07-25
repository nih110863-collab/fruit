import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin')

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <h1 className="mb-1 text-center text-2xl font-bold">사장님 관리자</h1>
      <p className="mb-6 text-center text-sm text-stone-500">
        {process.env.NEXT_PUBLIC_SHOP_NAME || '새벽앤과일'}
        {process.env.NEXT_PUBLIC_SHOP_BRANCH && ` / ${process.env.NEXT_PUBLIC_SHOP_BRANCH}`}
      </p>
      <div className="card">
        <LoginForm />
      </div>
    </main>
  )
}

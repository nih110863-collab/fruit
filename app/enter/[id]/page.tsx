import Link from 'next/link'
import { redirect } from 'next/navigation'
import PinPad from './PinPad'
import { getCustomerId } from '@/lib/auth'
import { getCustomer } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function EnterPage({ params }: { params: Promise<{ id: string }> }) {
  if (await getCustomerId()) redirect('/order')

  const { id } = await params
  const customerId = Number(id)
  if (!Number.isInteger(customerId)) redirect('/')

  const customer = await getCustomer(customerId)
  if (!customer) redirect('/')

  const lockedUntil = customer.pin_locked_until ? new Date(customer.pin_locked_until) : null
  const locked = Boolean(lockedUntil && lockedUntil.getTime() > Date.now())
  const minutesLeft = lockedUntil
    ? Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000))
    : 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      {locked ? (
        <div className="space-y-5 text-center">
          <p className="text-2xl font-bold">{customer.nickname}</p>
          <p className="rounded-xl bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
            비밀번호를 여러 번 틀려 잠겼습니다.
            <br />
            {minutesLeft}분 뒤에 다시 시도해주세요.
          </p>
          <p className="text-xs text-stone-500">
            비밀번호가 기억나지 않으면 사장님께 말씀해주세요. 다시 정하실 수 있습니다.
          </p>
        </div>
      ) : (
        <PinPad
          customerId={customer.id}
          nickname={customer.nickname}
          mode={customer.pin_hash ? 'verify' : 'create'}
        />
      )}

      <Link
        href="/"
        className="mt-10 text-center text-sm text-stone-400 underline underline-offset-4"
      >
        다른 이름 고르기
      </Link>
    </main>
  )
}

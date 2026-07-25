/**
 * 가게 이름 / 지점 / 연락처 / 오픈채팅 링크.
 * 지점·연락처·오픈채팅은 환경변수에 값이 있을 때만 나타난다.
 * 좁은 화면에서도 이름이 잘리지 않도록 이름 줄과 아이콘 줄을 분리한다.
 */
export default function ShopHeader({ subtitle, right }: { subtitle: string; right?: React.ReactNode }) {
  const name = process.env.NEXT_PUBLIC_SHOP_NAME || '새벽앤과일'
  const branch = process.env.NEXT_PUBLIC_SHOP_BRANCH
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE
  const openChat = process.env.NEXT_PUBLIC_OPENCHAT_URL
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null

  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold leading-tight tracking-tight">
        {name}
        {branch && <span className="ml-1.5 text-base font-semibold text-stone-400">/ {branch}</span>}
      </h1>

      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-stone-500">
          {subtitle}
          {phone && telHref && (
            <>
              {' · '}
              <a href={telHref} className="underline underline-offset-2">
                {phone}
              </a>
            </>
          )}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          {right}

          {telHref && (
            <a
              href={telHref}
              aria-label="가게에 전화 걸기"
              title="전화 걸기"
              className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5" aria-hidden="true">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2z" />
              </svg>
            </a>
          )}

          {openChat && (
            <a
              href={openChat}
              target="_blank"
              rel="noreferrer"
              aria-label="오픈채팅방 열기"
              title="오픈채팅방"
              className="flex size-9 items-center justify-center rounded-full bg-[#FEE500] text-[#3C1E1E] shadow-sm transition active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5" aria-hidden="true">
                <path d="M12 3C6.9 3 2.8 6.3 2.8 10.3c0 2.6 1.7 4.8 4.3 6.1-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.7-1.8 3.7-2.6.5.1 1.1.1 1.6.1 5.1 0 9.2-3.3 9.2-7.3S17.1 3 12 3z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

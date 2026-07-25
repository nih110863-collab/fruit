import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SHOP_NAME || '새벽앤과일',
  description: '회원가입 없이 닉네임과 휴대폰 뒷자리로 주문하는 동네 장보기',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#166534',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

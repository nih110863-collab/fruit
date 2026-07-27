import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getShopSettings } from '@/lib/queries'

export async function generateMetadata(): Promise<Metadata> {
  const { shopName, shopBranch } = await getShopSettings()
  return {
    title: shopBranch ? `${shopName} / ${shopBranch}` : shopName,
    description: '회원가입 없이 닉네임과 비밀번호로 주문하는 동네 장보기',
  }
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

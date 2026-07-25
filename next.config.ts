import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@neondatabase/serverless', 'ws', 'pg'],
  experimental: {
    // 품목 사진(축소된 JPEG)을 Server Action 으로 올리므로 기본 1MB 보다 여유를 둔다
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default nextConfig

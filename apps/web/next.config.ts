import type { NextConfig } from "next"

const LOCAL_API_URL = process.env.LOCAL_API_URL ?? "http://localhost:5678"

const nextConfig: NextConfig = {
  async rewrites() {
    // 将 /local-api/* 代理到 local-api 后端，前端无需处理 CORS
    return [
      {
        source: "/local-api/:path*",
        destination: `${LOCAL_API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig

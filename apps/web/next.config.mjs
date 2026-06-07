const LOCAL_API_URL = process.env.LOCAL_API_URL ?? "http://localhost:5678"

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/local-api/:path*",
        destination: `${LOCAL_API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig

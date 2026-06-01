import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "YouStory",
  description: "把人生片段记录下来，并从记录开始故事创作。",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}

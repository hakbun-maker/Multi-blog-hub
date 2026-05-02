import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Multi Blog Hub',
    template: '%s · Multi Blog Hub',
  },
  description: '복수의 블로그를 하나의 허브에서 관리하세요',
  applicationName: 'Multi Blog Hub',
  openGraph: {
    title: 'Multi Blog Hub',
    description: '복수의 블로그를 하나의 허브에서 관리하세요',
    images: [{ url: '/og-image.png', width: 1580, height: 362, alt: 'Multi Blog Hub' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multi Blog Hub',
    description: '복수의 블로그를 하나의 허브에서 관리하세요',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

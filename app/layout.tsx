import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
})

export const metadata: Metadata = {
  title: 'Benji HQ',
  description: 'Family command center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{children}</body>
    </html>
  )
}

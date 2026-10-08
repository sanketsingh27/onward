import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Onward — job match',
  description: 'Rank the openings worth your next application.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  )
}

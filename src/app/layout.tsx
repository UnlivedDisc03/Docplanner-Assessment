import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Suspense } from 'react'
import { HeaderSearch } from './components/HeaderSearch'
import { ChatWidget } from './components/ChatWidget'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'NieruchomościPL — Ogłoszenia',
  description: 'Przeglądaj oferty nieruchomości z całej Polski',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#f5f5f5] antialiased font-[var(--font-geist)]">
        <header className="bg-[#1C1C21] sticky top-0 z-10 h-[60px]">
          <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center gap-6">
            <a href="/" className="text-white font-bold text-lg tracking-tight shrink-0">
              Nieru<span className="text-[#00C97A]">chomo</span>ściPL
            </a>
            <Suspense fallback={<div className="flex-1 max-w-[500px] h-[38px]" />}>
              <HeaderSearch />
            </Suspense>
            <nav className="flex items-center gap-5 shrink-0 ml-auto">
              <a href="/" className="text-[#ccc] hover:text-white text-sm transition-colors">Sprzedaż</a>
              <a href="/" className="text-[#ccc] hover:text-white text-sm transition-colors">Wynajem</a>
              <a href="/" className="text-[#ccc] hover:text-white text-sm transition-colors">Nowe budynki</a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <ChatWidget />
      </body>
    </html>
  )
}

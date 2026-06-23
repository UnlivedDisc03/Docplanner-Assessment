import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'NieruchomościPL — Ogłoszenia',
  description: 'Przeglądaj oferty nieruchomości z całej Polski',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 antialiased font-[var(--font-geist)]">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
            <a href="/" className="text-emerald-600 font-bold text-lg tracking-tight">NieruchomościPL</a>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} NieruchomościPL
        </footer>
      </body>
    </html>
  )
}

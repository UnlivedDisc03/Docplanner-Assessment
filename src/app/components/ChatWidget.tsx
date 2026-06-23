'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Listing } from '@/domain/listing/Listing'

type Message = {
  role: 'user' | 'assistant'
  content: string
  listings?: Listing[]
  total?: number
}

type ApiMessage = {
  role: 'user' | 'assistant'
  content: string
}

const BAD = ['logo', 'icon', 'avatar', 'agent', 'thumbs120', 'thumbnail', 's=314x236', 's=256x']
function bestImage(images: string[]) {
  return images.find(s => !BAD.some(p => s.includes(p))) ?? images[0]
}
function fmtPrice(price: number | null, currency: string) {
  if (!price) return 'Cena na zapytanie'
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency || 'PLN', maximumFractionDigits: 0 }).format(price)
}

function ListingChip({ listing }: { listing: Listing }) {
  const img = bestImage(listing.images)
  const meta = [
    listing.area && `${listing.area} m²`,
    listing.rooms && `${listing.rooms} pok.`,
    listing.city,
  ].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/listing/${listing.id}`}
      target="_blank"
      className="flex gap-2.5 p-2.5 bg-white rounded-lg border border-[#e8e8e8] hover:border-[#00C97A]/60 hover:shadow-sm transition-all"
    >
      <div className="w-16 h-12 rounded-md overflow-hidden bg-[#e8e8e8] shrink-0">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="text-xs font-semibold text-[#1a1a1a] line-clamp-1 leading-tight">{listing.title}</div>
        <div className="text-xs font-bold text-[#00C97A] mt-0.5">{fmtPrice(listing.price, listing.currency)}</div>
        {meta && <div className="text-[10px] text-[#999] mt-0.5">{meta}</div>}
      </div>
    </Link>
  )
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'Cześć! 👋 Powiedz mi czego szukasz, a znajdę dla Ciebie pasujące oferty. Np. „Mieszkanie w Krakowie, 2 pokoje, do 500 000 zł".',
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    try {
      const history: ApiMessage[] = next
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message ?? '', listings: data.listings, total: data.total },
      ])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-[180] w-14 h-14 bg-[#1C1C21] hover:bg-[#2a2a30] text-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label="Chat z asystentem"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            <circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>
          </svg>
        )}
        {/* Green dot indicator */}
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00C97A] rounded-full border-2 border-[#1C1C21]" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[180] w-[380px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[#e8e8e8] flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(560px, calc(100vh - 120px))' }}
        >
          {/* Header */}
          <div className="bg-[#1C1C21] px-4 py-3.5 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#00C97A]/20 flex items-center justify-center shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#00C97A" stroke="none">
                <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight">Asystent AI</div>
              <div className="text-[#00C97A] text-[10px] font-medium">● Online</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1C1C21] text-white rounded-br-sm'
                      : 'bg-[#f5f5f5] text-[#1a1a1a] rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.listings && msg.listings.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.total && msg.total > msg.listings.length && (
                        <div className="text-[10px] text-[#888] px-1 mb-1">Pokazuję {msg.listings.length} z {msg.total} ofert</div>
                      )}
                      {msg.listings.map(l => <ListingChip key={l.id} listing={l} />)}
                    </div>
                  )}
                  {msg.listings?.length === 0 && msg.role === 'assistant' && msg !== WELCOME && (
                    <div className="mt-1.5 text-[10px] text-[#bbb] px-1">Brak wyników dla podanych kryteriów</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#f5f5f5] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#f0f0f0] shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); send() }}
              className="flex gap-2 items-center bg-[#f5f5f5] rounded-xl px-3 py-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Opisz czego szukasz..."
                className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-[#00C97A] disabled:bg-[#d0d0d0] rounded-lg flex items-center justify-center transition-colors shrink-0"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

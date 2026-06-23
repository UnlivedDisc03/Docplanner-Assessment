'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function HeaderSearch() {
  const router = useRouter()
  const sp = useSearchParams()
  const [value, setValue] = useState(sp.get('q') ?? '')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = value.trim()
    if (!query) {
      router.push('/')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/search-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const { params } = await res.json() as { params: Record<string, string> }
      const urlParams = new URLSearchParams(params)
      urlParams.set('_ai', '1')
      router.push(`/?${urlParams.toString()}`)
    } catch {
      // fallback to plain text search
      router.push(`/?q=${encodeURIComponent(query)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex-1 max-w-[500px] flex bg-white rounded-lg overflow-hidden h-[38px]">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Opisz czego szukasz..."
        disabled={loading}
        className="flex-1 border-none outline-none px-3.5 text-sm text-[#1a1a1a] disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-[#00C97A] hover:bg-[#00b36b] disabled:bg-[#00C97A]/70 transition-colors px-4 text-white font-semibold text-sm flex items-center gap-1.5 shrink-0"
      >
        {loading ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        ) : 'Szukaj'}
      </button>
    </form>
  )
}

'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function HeaderSearch() {
  const router = useRouter()
  const sp = useSearchParams()
  const [value, setValue] = useState(sp.get('q') ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(sp.toString())
    if (value) params.set('q', value)
    else params.delete('q')
    params.delete('page')
    router.push(`/?${params.toString()}`)
  }

  return (
    <form onSubmit={submit} className="flex-1 max-w-[500px] flex bg-white rounded-lg overflow-hidden h-[38px]">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Miasto, dzielnica, adres..."
        className="flex-1 border-none outline-none px-3.5 text-sm text-[#1a1a1a]"
      />
      <button type="submit" className="bg-[#00C97A] hover:bg-[#00b36b] transition-colors px-4 text-white font-semibold text-sm">
        Szukaj
      </button>
    </form>
  )
}

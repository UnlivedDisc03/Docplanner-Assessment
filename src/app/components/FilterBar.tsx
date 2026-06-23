'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function FilterBar() {
  const router = useRouter()
  const sp = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/?${params.toString()}`)
  }, [router, sp])

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        type="search"
        placeholder="Szukaj..."
        defaultValue={sp.get('q') ?? ''}
        onChange={e => update('q', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="text"
        placeholder="Miasto"
        defaultValue={sp.get('city') ?? ''}
        onChange={e => update('city', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="number"
        placeholder="Cena od"
        defaultValue={sp.get('priceMin') ?? ''}
        onChange={e => update('priceMin', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="number"
        placeholder="Cena do"
        defaultValue={sp.get('priceMax') ?? ''}
        onChange={e => update('priceMax', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <select
        defaultValue={sp.get('rooms') ?? ''}
        onChange={e => update('rooms', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">Pokoje</option>
        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
      </select>
    </div>
  )
}

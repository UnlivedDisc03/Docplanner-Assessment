'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { FiltersDropdown } from './FiltersDropdown'

interface Props {
  total: number
}

export function FilterBar({ total }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const update = useCallback((key: string, value: string) => {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      router.push(`/?${params.toString()}`)
    }, 400)
  }, [router, sp])

  const inputCls = 'border border-[#ddd] rounded-full px-3.5 py-1.5 text-sm bg-white focus:outline-none focus:border-[#00C97A] transition-colors placeholder:text-[#aaa] text-[#1a1a1a] min-w-0'
  const selectCls = 'border border-[#ddd] rounded-full px-3.5 py-1.5 text-sm bg-white focus:outline-none focus:border-[#00C97A] transition-colors text-[#555] cursor-pointer'

  return (
    <div className="bg-white border-b border-[#e8e8e8] sticky top-[60px] z-[99]">
      <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center gap-2.5 flex-wrap">
        <input
          type="text"
          placeholder="Miasto"
          defaultValue={sp.get('city') ?? ''}
          onChange={e => update('city', e.target.value)}
          className={`${inputCls} w-36`}
        />
        <input
          type="number"
          placeholder="Cena od"
          defaultValue={sp.get('priceMin') ?? ''}
          onChange={e => update('priceMin', e.target.value)}
          className={`${inputCls} w-28`}
        />
        <input
          type="number"
          placeholder="Cena do"
          defaultValue={sp.get('priceMax') ?? ''}
          onChange={e => update('priceMax', e.target.value)}
          className={`${inputCls} w-28`}
        />
        <select
          defaultValue={sp.get('rooms') ?? ''}
          onChange={e => update('rooms', e.target.value)}
          className={selectCls}
        >
          <option value="">Pokoje</option>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
        </select>
        <select
          defaultValue={sp.get('marketType') ?? ''}
          onChange={e => update('marketType', e.target.value)}
          className={selectCls}
        >
          <option value="">Rynek</option>
          <option value="primary">Pierwotny</option>
          <option value="secondary">Wtórny</option>
        </select>
        <FiltersDropdown />
        <span className="ml-auto text-sm text-[#888] shrink-0">{total.toLocaleString('pl-PL')} ofert</span>
      </div>
    </div>
  )
}

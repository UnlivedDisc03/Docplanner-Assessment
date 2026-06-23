'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Mieszkanie' },
  { value: 'house', label: 'Dom' },
  { value: 'studio', label: 'Studio' },
]

const CONDITIONS = [
  { value: 'move_in_ready', label: 'Do zamieszkania' },
  { value: 'developer_state', label: 'Stan deweloperski' },
  { value: 'high_standard', label: 'Wysoki standard' },
  { value: 'needs_renovation', label: 'Do remontu' },
]

const AMENITIES: { key: string; label: string }[] = [
  { key: 'hasBalcony', label: 'Balkon' },
  { key: 'hasParking', label: 'Parking / Garaż' },
  { key: 'hasGarden', label: 'Ogród' },
  { key: 'hasElevator', label: 'Winda' },
  { key: 'hasExtras', label: 'Dodatkowe cechy' },
]

function parseList(val: string | null): string[] {
  return val ? val.split(',').filter(Boolean) : []
}

export function FiltersDropdown() {
  const router = useRouter()
  const sp = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const propertyTypes = parseList(sp.get('propertyTypes'))
  const conditions = parseList(sp.get('conditions'))

  const activeCount =
    propertyTypes.length +
    conditions.length +
    ['hasBalcony', 'hasParking', 'hasGarden', 'hasElevator', 'hasExtras'].filter(k => sp.get(k) === '1').length

  const push = useCallback((params: URLSearchParams) => {
    params.delete('page')
    params.delete('_ai')
    router.push(`/?${params.toString()}`)
  }, [router])

  const toggleList = (paramKey: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    const current = parseList(params.get(paramKey))
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    if (next.length) params.set(paramKey, next.join(','))
    else params.delete(paramKey)
    push(params)
  }

  const toggleBool = (key: string) => {
    const params = new URLSearchParams(sp.toString())
    if (params.get(key) === '1') params.delete(key)
    else params.set(key, '1')
    push(params)
  }

  const clearAll = () => {
    const params = new URLSearchParams(sp.toString())
    ;['propertyTypes', 'conditions', 'hasBalcony', 'hasParking', 'hasGarden', 'hasElevator', 'hasExtras'].forEach(k => params.delete(k))
    push(params)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc) }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 border rounded-full px-3.5 py-1.5 text-sm transition-colors ${
          open || activeCount > 0
            ? 'border-[#1C1C21] bg-[#1C1C21] text-white'
            : 'border-[#ddd] bg-white text-[#555] hover:border-[#999]'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
        Filtry
        {activeCount > 0 && (
          <span className="ml-0.5 bg-[#00C97A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-[150] bg-white border border-[#e8e8e8] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[520px] p-5">
          <div className="grid grid-cols-3 gap-x-6 gap-y-5">

            {/* Property type */}
            <div>
              <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider mb-2.5">Typ nieruchomości</div>
              <div className="space-y-2">
                {PROPERTY_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={propertyTypes.includes(value)}
                      onChange={() => toggleList('propertyTypes', value)}
                      className="w-4 h-4 rounded border-[#ccc] accent-[#00C97A] cursor-pointer"
                    />
                    <span className="text-sm text-[#333] group-hover:text-[#1a1a1a]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider mb-2.5">Stan wykończenia</div>
              <div className="space-y-2">
                {CONDITIONS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={conditions.includes(value)}
                      onChange={() => toggleList('conditions', value)}
                      className="w-4 h-4 rounded border-[#ccc] accent-[#00C97A] cursor-pointer"
                    />
                    <span className="text-sm text-[#333] group-hover:text-[#1a1a1a]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider mb-2.5">Udogodnienia</div>
              <div className="space-y-2">
                {AMENITIES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={sp.get(key) === '1'}
                      onChange={() => toggleBool(key)}
                      className="w-4 h-4 rounded border-[#ccc] accent-[#00C97A] cursor-pointer"
                    />
                    <span className="text-sm text-[#333] group-hover:text-[#1a1a1a]">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {activeCount > 0 && (
            <div className="border-t border-[#f0f0f0] mt-4 pt-3.5 flex justify-end">
              <button
                onClick={clearAll}
                className="text-sm text-[#888] hover:text-[#1a1a1a] underline underline-offset-2 transition-colors"
              >
                Wyczyść filtry ({activeCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

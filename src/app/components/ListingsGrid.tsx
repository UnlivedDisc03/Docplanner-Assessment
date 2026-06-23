'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Listing } from '@/domain/listing/Listing'
import { ListingCard } from './ListingCard'

interface Props {
  initialListings: Listing[]
  initialTotal: number
  searchParams: Record<string, string>
}

export function ListingsGrid({ initialListings, initialTotal, searchParams }: Props) {
  const [listings, setListings] = useState<Listing[]>(initialListings)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialListings.length < initialTotal)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setListings(initialListings)
    setPage(1)
    setHasMore(initialListings.length < initialTotal)
    loadingRef.current = false
  }, [initialListings, initialTotal])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    const nextPage = page + 1
    const params = new URLSearchParams({ ...searchParams, page: String(nextPage), limit: '20' })
    const res = await fetch(`/api/listings?${params}`)
    const data = await res.json()
    setListings(prev => {
      const existingIds = new Set(prev.map(l => l.id))
      const fresh = (data.data as Listing[]).filter(l => !existingIds.has(l.id))
      return [...prev, ...fresh]
    })
    setPage(nextPage)
    setHasMore(nextPage < data.totalPages)
    loadingRef.current = false
    setLoading(false)
  }, [hasMore, page, searchParams])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  if (listings.length === 0) {
    return <p className="text-center text-[#888] py-16">Brak ogłoszeń spełniających kryteria.</p>
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
      </div>
      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {loading && <span className="text-sm text-[#aaa]">Ładowanie...</span>}
      </div>
    </>
  )
}

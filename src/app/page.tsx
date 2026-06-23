import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { GetListings } from '@/application/listing/GetListings'
import { FilterBar } from './components/FilterBar'
import { ListingsGrid } from './components/ListingsGrid'

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams
  const filters = {
    q: sp.q,
    city: sp.city,
    priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
    priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
    areaMin: sp.areaMin ? Number(sp.areaMin) : undefined,
    areaMax: sp.areaMax ? Number(sp.areaMax) : undefined,
    rooms: sp.rooms ? Number(sp.rooms) : undefined,
    marketType: sp.marketType as 'primary' | 'secondary' | undefined,
    propertyTypes: sp.propertyTypes ? sp.propertyTypes.split(',') : undefined,
    conditions: sp.conditions ? sp.conditions.split(',') : undefined,
    hasBalcony: sp.hasBalcony === '1' || undefined,
    hasParking: sp.hasParking === '1' || undefined,
    hasGarden: sp.hasGarden === '1' || undefined,
    hasElevator: sp.hasElevator === '1' || undefined,
    hasExtras: sp.hasExtras === '1' || undefined,
    page: 1,
    limit: 20,
  }

  const repository = new PrismaListingRepository(prisma)
  const useCase = new GetListings(repository)
  const { data, total } = await useCase.execute(filters)

  return (
    <>
      <Suspense fallback={<div className="h-[52px] bg-white border-b border-[#e8e8e8] sticky top-[60px] z-[99]" />}>
        <FilterBar total={total} />
      </Suspense>
      <div className="max-w-[1280px] mx-auto px-6 py-5">
        <ListingsGrid initialListings={data} initialTotal={total} searchParams={sp} />
      </div>
    </>
  )
}

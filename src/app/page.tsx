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
    page: 1,
    limit: 20,
  }

  const repository = new PrismaListingRepository(prisma)
  const useCase = new GetListings(repository)
  const { data, total } = await useCase.execute(filters)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Ogłoszenia nieruchomości</h1>
        <p className="text-sm text-gray-500">{total} ofert</p>
      </div>
      <div className="mb-5">
        <Suspense>
          <FilterBar />
        </Suspense>
      </div>
      <ListingsGrid initialListings={data} initialTotal={total} searchParams={sp} />
    </div>
  )
}

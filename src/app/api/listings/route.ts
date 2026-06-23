import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { GetListings } from '@/application/listing/GetListings'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const filters = {
    q: sp.get('q') ?? undefined,
    city: sp.get('city') ?? undefined,
    priceMin: sp.has('priceMin') ? Number(sp.get('priceMin')) : undefined,
    priceMax: sp.has('priceMax') ? Number(sp.get('priceMax')) : undefined,
    areaMin: sp.has('areaMin') ? Number(sp.get('areaMin')) : undefined,
    areaMax: sp.has('areaMax') ? Number(sp.get('areaMax')) : undefined,
    rooms: sp.has('rooms') ? Number(sp.get('rooms')) : undefined,
    marketType: (sp.get('marketType') as 'primary' | 'secondary') || undefined,
    propertyTypes: sp.get('propertyTypes') ? sp.get('propertyTypes')!.split(',') : undefined,
    conditions: sp.get('conditions') ? sp.get('conditions')!.split(',') : undefined,
    hasBalcony: sp.get('hasBalcony') === '1' || undefined,
    hasParking: sp.get('hasParking') === '1' || undefined,
    hasGarden: sp.get('hasGarden') === '1' || undefined,
    hasElevator: sp.get('hasElevator') === '1' || undefined,
    hasExtras: sp.get('hasExtras') === '1' || undefined,
    page: sp.has('page') ? Number(sp.get('page')) : 1,
    limit: sp.has('limit') ? Number(sp.get('limit')) : 20,
  }

  const repository = new PrismaListingRepository(prisma)
  const useCase = new GetListings(repository)
  const result = await useCase.execute(filters)
  return Response.json(result)
}
